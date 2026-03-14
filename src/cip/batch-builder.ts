/**
 * Batch Builder — packs multiple CIP service requests into
 * Multi-Service Packet (0x0A) batches that fit within the
 * negotiated connection size.
 *
 * Tracks BOTH request and response sizes to avoid overflow.
 * Per CIP Vol 1, Appendix A-7 — Multiple Service Packet
 *
 * Multi-Service Packet layout:
 *   [serviceCount(2), offset1(2), offset2(2), ..., service1, service2, ...]
 */

import * as MessageRouter from './message-router';
import { CIPService } from './services';
import { LogicalType, buildLogicalSegment } from './epath/segments/logical';

/** Message Router path: Class 0x02, Instance 0x01 */
const MESSAGE_ROUTER_PATH = Buffer.concat([
  buildLogicalSegment(LogicalType.ClassID, 0x02),
  buildLogicalSegment(LogicalType.InstanceID, 0x01),
]);

/** Overhead bytes in the request multi-service packet (before services) */
const REQUEST_BASE_OVERHEAD = 2; // service count (UINT16LE)

/** Per-service overhead in request: offset entry (UINT16LE) */
const REQUEST_PER_SERVICE_OVERHEAD = 2;

/** Overhead bytes in the response multi-service packet */
const RESPONSE_BASE_OVERHEAD = 2; // service count

/** Per-service overhead in response: offset(2) + reply header(4: service, reserved, status, extStatusLen) */
const RESPONSE_PER_SERVICE_OVERHEAD = 6;

export interface BatchRequest {
  /** Pre-built CIP service request (e.g. Read Tag message) */
  serviceData: Buffer;
  /** Estimated response size in bytes (from TYPE_SIZES) */
  estimatedResponseSize: number;
}

export interface Batch {
  /** The individual requests in this batch */
  requests: BatchRequest[];
  /** Assembled Multi-Service Packet ready to send */
  data: Buffer;
}

/**
 * Split an array of CIP service requests into optimally-packed
 * Multi-Service Packet batches.
 *
 * @param requests       - Individual CIP service requests with size estimates
 * @param connectionSize - Max packet size from Forward Open (504 or 4002)
 */
export function buildBatches(requests: BatchRequest[], connectionSize: number): Batch[] {
  if (requests.length === 0) return [];
  if (requests.length === 1) {
    // Single request — no need for multi-service wrapping
    return [{ requests, data: requests[0].serviceData }];
  }

  const batches: Batch[] = [];
  let currentRequests: BatchRequest[] = [];
  let requestSize = REQUEST_BASE_OVERHEAD;
  let responseSize = RESPONSE_BASE_OVERHEAD;

  for (const req of requests) {
    const nextRequestSize = requestSize + REQUEST_PER_SERVICE_OVERHEAD + req.serviceData.length;
    const nextResponseSize =
      responseSize + RESPONSE_PER_SERVICE_OVERHEAD + req.estimatedResponseSize;

    // Check if adding this request would exceed either limit
    if (
      currentRequests.length > 0 &&
      (nextRequestSize > connectionSize || nextResponseSize > connectionSize)
    ) {
      // Seal current batch
      batches.push(assembleBatch(currentRequests));
      currentRequests = [];
      requestSize = REQUEST_BASE_OVERHEAD;
      responseSize = RESPONSE_BASE_OVERHEAD;
    }

    currentRequests.push(req);
    requestSize += REQUEST_PER_SERVICE_OVERHEAD + req.serviceData.length;
    responseSize += RESPONSE_PER_SERVICE_OVERHEAD + req.estimatedResponseSize;
  }

  // Seal final batch
  if (currentRequests.length > 0) {
    batches.push(assembleBatch(currentRequests));
  }

  return batches;
}

/**
 * Assemble a batch of requests into a Multi-Service Packet.
 */
function assembleBatch(requests: BatchRequest[]): Batch {
  const serviceCount = requests.length;

  // Service count (2 bytes) + offset table (2 bytes per service)
  const headerSize = REQUEST_BASE_OVERHEAD + serviceCount * REQUEST_PER_SERVICE_OVERHEAD;

  // Build offset table
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(serviceCount, 0); // Service count

  let currentOffset = headerSize; // First service starts after header
  for (let i = 0; i < serviceCount; i++) {
    header.writeUInt16LE(currentOffset, REQUEST_BASE_OVERHEAD + i * 2); // Offset for service i
    currentOffset += requests[i].serviceData.length;
  }

  // Concatenate header + all service data
  const payload = Buffer.concat([header, ...requests.map((r) => r.serviceData)]);

  // Wrap in Message Router targeting Message Router object
  const data = MessageRouter.build(
    CIPService.MULTIPLE_SERVICE_PACKET,
    MESSAGE_ROUTER_PATH,
    payload,
  );

  return { requests, data };
}
