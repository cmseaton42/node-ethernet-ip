"use strict";
/**
 * Batch Builder — packs multiple CIP service requests into
 * Multi-Service Packet (0x0A) batches that fit within the
 * negotiated connection size.
 *
 * Tracks BOTH request and response sizes to avoid overflow.
 * Per CIP Vol 1, Appendix A-7 — Multiple Service Packet
 *
 * Request packet structure (connected):
 *   EIP Header (24) + InterfaceHandle (4) + Timeout (2) + CPF (varies)
 *   └─ Connected Data Item: SequenceCount (2) + CIP data
 *      └─ MR header: Service (1) + PathSize (1) + Path (4)
 *         └─ Multi-Service: Count (2) + Offsets (2×N) + ServiceData[]
 *
 * Response packet structure (connected):
 *   EIP Header (24) + InterfaceHandle (4) + Timeout (2) + CPF (varies)
 *   └─ Connected Data Item: SequenceCount (2) + CIP data
 *      └─ MR header: Service (1) + Reserved (1) + Status (1) + ExtSize (1)
 *         └─ Multi-Service: Count (2) + Offsets (2×N) + Replies[]
 *            └─ Each reply: Service (1) + Reserved (1) + Status (1) + ExtSize (1) + Data
 *
 * The connectionSize limits the Connected Data Item payload (seq + CIP).
 * For unconnected (UCMM), there is no sequence count — CIP data goes directly.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBatches = buildBatches;
exports.parseMultiServiceResponse = parseMultiServiceResponse;
const MessageRouter = __importStar(require("./message-router"));
const services_1 = require("./services");
const logical_1 = require("./epath/segments/logical");
/** Message Router path: Class 0x02, Instance 0x01 */
const MESSAGE_ROUTER_PATH = Buffer.concat([
    (0, logical_1.buildLogicalSegment)(logical_1.LogicalType.ClassID, 0x02),
    (0, logical_1.buildLogicalSegment)(logical_1.LogicalType.InstanceID, 0x01),
]);
/**
 * MR wrapper overhead added by assembleBatch:
 *   service(1) + pathSize(1) + path(4 for class 0x02 instance 0x01) = 6 bytes
 */
const MR_REQUEST_OVERHEAD = 2 + MESSAGE_ROUTER_PATH.length;
/**
 * MR response header: service(1) + reserved(1) + status(1) + extStatusSize(1) = 4 bytes
 */
const MR_RESPONSE_OVERHEAD = 4;
/**
 * Connected transport overhead: sequence count (2 bytes) prepended to CIP data.
 * The connection size limits sequenceCount + CIP data, so usable CIP space
 * is connectionSize - CONNECTED_TRANSPORT_OVERHEAD.
 */
const CONNECTED_TRANSPORT_OVERHEAD = 2;
/** Overhead bytes in the request multi-service packet (before services) */
const REQUEST_BASE_OVERHEAD = 2; // service count (UINT16LE)
/** Per-service overhead in request: offset entry (UINT16LE) */
const REQUEST_PER_SERVICE_OVERHEAD = 2;
/** Overhead bytes in the response multi-service packet */
const RESPONSE_BASE_OVERHEAD = 2; // service count
/** Per-service overhead in response: offset(2) + reply header(4: service, reserved, status, extStatusLen) */
const RESPONSE_PER_SERVICE_OVERHEAD = 6;
/**
 * Split an array of CIP service requests into optimally-packed
 * Multi-Service Packet batches.
 *
 * Accounts for all protocol overhead:
 *   Connected:   connectionSize ≥ seqCount(2) + MR(6) + multiSvc header + services
 *   Unconnected: connectionSize ≥ MR(6) + multiSvc header + services
 *
 * @param requests       - Individual CIP service requests with size estimates
 * @param connectionSize - Max packet size (4002 Large, 504 Small, 508 UCMM)
 * @param connected      - True for connected messaging (sequence count overhead)
 */
function buildBatches(requests, connectionSize, connected) {
    if (requests.length === 0)
        return [];
    if (requests.length === 1) {
        // Single request — no need for multi-service wrapping
        return [{ requests, data: requests[0].serviceData }];
    }
    const transportOverhead = connected ? CONNECTED_TRANSPORT_OVERHEAD : 0;
    const maxCipPayload = connectionSize - transportOverhead;
    // Fixed overhead per batch: MR wrapper + multi-service count field
    const requestFixedOverhead = MR_REQUEST_OVERHEAD + REQUEST_BASE_OVERHEAD;
    const responseFixedOverhead = MR_RESPONSE_OVERHEAD + RESPONSE_BASE_OVERHEAD;
    const batches = [];
    let currentRequests = [];
    let requestSize = requestFixedOverhead;
    let responseSize = responseFixedOverhead;
    for (const req of requests) {
        const nextRequestSize = requestSize + REQUEST_PER_SERVICE_OVERHEAD + req.serviceData.length;
        const nextResponseSize = responseSize + RESPONSE_PER_SERVICE_OVERHEAD + req.estimatedResponseSize;
        if (currentRequests.length > 0 &&
            (nextRequestSize > maxCipPayload || nextResponseSize > maxCipPayload)) {
            batches.push(assembleBatch(currentRequests));
            currentRequests = [];
            requestSize = requestFixedOverhead;
            responseSize = responseFixedOverhead;
        }
        currentRequests.push(req);
        requestSize += REQUEST_PER_SERVICE_OVERHEAD + req.serviceData.length;
        responseSize += RESPONSE_PER_SERVICE_OVERHEAD + req.estimatedResponseSize;
    }
    batches.push(assembleBatch(currentRequests));
    return batches;
}
/**
 * Assemble a batch of requests into a Multi-Service Packet.
 */
function assembleBatch(requests) {
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
    const data = MessageRouter.build(services_1.CIPService.MULTIPLE_SERVICE_PACKET, MESSAGE_ROUTER_PATH, payload);
    return { requests, data };
}
/**
 * Parse a Multi-Service Packet response into individual MR responses.
 *
 * Response layout (after MR header is stripped):
 *   [count(2), offset0(2), offset1(2), ..., reply0, reply1, ...]
 *
 * Offsets are relative to the count field.
 * Each reply is a standard Message Router response.
 */
function parseMultiServiceResponse(data) {
    const count = data.readUInt16LE(0);
    const replies = [];
    for (let i = 0; i < count; i++) {
        const offset = data.readUInt16LE(2 + i * 2);
        const nextOffset = i + 1 < count ? data.readUInt16LE(2 + (i + 1) * 2) : data.length;
        replies.push(MessageRouter.parse(data.subarray(offset, nextOffset)));
    }
    return replies;
}
//# sourceMappingURL=batch-builder.js.map