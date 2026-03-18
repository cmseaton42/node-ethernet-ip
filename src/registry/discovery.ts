/**
 * Tag list discovery — Get Instance Attribute List (class 0x6B).
 * Per CIP Vol 1, Chapter 7 — Symbol Object
 *
 * Paginates with status 0x06 (partial transfer).
 */

import { RequestPipeline } from '@/pipeline/request-pipeline';
import * as MessageRouter from '@/cip/message-router';
import { CIPService } from '@/cip/services';
import { EPathBuilder, LogicalType } from '@/cip/epath';
import { sendRRData } from '@/encapsulation/encapsulation';
import { parseHeader } from '@/encapsulation/header';

/** CIP status code for partial transfer (more data available) */
const STATUS_PARTIAL_TRANSFER = 0x06;

/** Offset to CIP data within SendRRData response payload */
const CIP_DATA_OFFSET = 16;

/** Tag type bit-packing per CIP spec */
const TAG_TYPE_STRUCT_FLAG = 0x8000;
const TAG_TYPE_RESERVED_FLAG = 0x1000;
const TAG_TYPE_ARRAY_DIMS_MASK = 0x6000;
const TAG_TYPE_ARRAY_DIMS_SHIFT = 13;
const TAG_TYPE_CODE_MASK = 0x0fff;

export interface DiscoveredTag {
  id: number;
  name: string;
  type: {
    code: number;
    isStruct: boolean;
    isReserved: boolean;
    arrayDims: number;
  };
  program: string | null;
}

/**
 * Parse the tag type bit field.
 * Bit 15 = struct, bits 14-13 = array dims, bit 12 = reserved, bits 11-0 = type code
 */
export function parseTagType(raw: number): DiscoveredTag['type'] {
  return {
    code: raw & TAG_TYPE_CODE_MASK,
    isStruct: !!(raw & TAG_TYPE_STRUCT_FLAG),
    isReserved: !!(raw & TAG_TYPE_RESERVED_FLAG),
    arrayDims: (raw & TAG_TYPE_ARRAY_DIMS_MASK) >> TAG_TYPE_ARRAY_DIMS_SHIFT,
  };
}

/**
 * Build the CIP request for Get Instance Attribute List.
 * Requests attributes 1 (Symbol Name) and 2 (Symbol Type).
 */
function buildTagListRequest(instanceId: number, program?: string): Buffer {
  const pathBuilder = new EPathBuilder();

  // Program scope prefix
  if (program) {
    pathBuilder.symbolic(`Program:${program}`);
  }

  // Symbol Object class 0x6B
  pathBuilder.logical(LogicalType.ClassID, 0x6b);

  // Start instance (0 = beginning)
  if (instanceId === 0) {
    // Instance 0: use raw bytes for the zero-instance encoding
    pathBuilder.logical(LogicalType.InstanceID, 0);
  } else {
    pathBuilder.logical(LogicalType.InstanceID, instanceId);
  }

  const path = pathBuilder.build();

  // Request data: attribute count(2) + attribute 1(2) + attribute 2(2)
  const ATTRIBUTE_COUNT = 2;
  const requestData = Buffer.alloc(6);
  requestData.writeUInt16LE(ATTRIBUTE_COUNT, 0);
  requestData.writeUInt16LE(0x01, 2); // Attribute 1: Symbol Name
  requestData.writeUInt16LE(0x02, 4); // Attribute 2: Symbol Type

  return MessageRouter.build(CIPService.GET_INSTANCE_ATTRIBUTE_LIST, path, requestData);
}

/**
 * Parse a tag list response buffer into DiscoveredTag entries.
 * Returns the last instance ID for pagination.
 */
function parseTagListResponse(
  data: Buffer,
  program: string | null,
): {
  tags: DiscoveredTag[];
  lastInstanceId: number;
} {
  const tags: DiscoveredTag[] = [];
  let lastInstanceId = 0;
  let offset = 0;

  while (offset < data.length) {
    // Instance ID (UINT32LE)
    const id = data.readUInt32LE(offset);
    offset += 4;

    // Name length (UINT16LE)
    const nameLength = data.readUInt16LE(offset);
    offset += 2;

    // Name (ASCII)
    const name = data.subarray(offset, offset + nameLength).toString('ascii');
    offset += nameLength;

    // Type (UINT16LE, bit-packed)
    const rawType = data.readUInt16LE(offset);
    offset += 2;

    tags.push({ id, name, type: parseTagType(rawType), program });
    lastInstanceId = id;
  }

  return { tags, lastInstanceId };
}

/**
 * Filter rules per Rockwell Data Access manual (1756-PM020D, Step 2):
 *
 * 1. Discard tags with bit 12 set (isReserved — system tags)
 * 2. Discard names starting with "__" (system tags)
 * 3. Discard names containing ":" UNLESS the prefix is "Program"
 *    - "Program:X" entries are program scope markers, not readable tags
 *    - "Map:", "Task:", "Cxn:", module I/O like "Codesys:I" are discarded
 *
 * Returns true if the tag should be kept.
 */
export function isUserTag(tag: DiscoveredTag): boolean {
  if (tag.type.isReserved) return false;
  if (tag.name.startsWith('__')) return false;
  const colonIdx = tag.name.indexOf(':');
  if (colonIdx !== -1 && tag.name.substring(0, colonIdx) !== 'Program') return false;
  return true;
}

/**
 * Extract program names from discovered tags.
 * "Program:MainProgram" → "MainProgram"
 * Note: Program entries typically have bit 12 (reserved) set.
 */
export function extractProgramNames(tags: DiscoveredTag[]): string[] {
  return tags
    .filter((t) => t.name.startsWith('Program:'))
    .map((t) => t.name.substring(8));
}

/**
 * Discover all tags from the PLC.
 * Paginates automatically when status 0x06 is returned.
 */
export async function discoverAll(
  pipeline: RequestPipeline,
  sessionId: number,
  timeoutMs: number,
  program?: string,
): Promise<DiscoveredTag[]> {
  const allTags: DiscoveredTag[] = [];
  let instanceId = 0;
  let hasMore = true;

  while (hasMore) {
    const cipRequest = buildTagListRequest(instanceId, program);
    const eipPacket = sendRRData(sessionId, cipRequest);
    const response = await pipeline.send(eipPacket, timeoutMs);
    const eipParsed = parseHeader(response);

    const cipData = eipParsed.data.subarray(CIP_DATA_OFFSET);
    const mrResponse = MessageRouter.parse(cipData);

    if (
      mrResponse.generalStatusCode !== 0 &&
      mrResponse.generalStatusCode !== STATUS_PARTIAL_TRANSFER
    ) {
      break; // Error — stop pagination
    }

    const { tags, lastInstanceId } = parseTagListResponse(mrResponse.data, program ?? null);
    allTags.push(...tags);

    if (mrResponse.generalStatusCode === STATUS_PARTIAL_TRANSFER) {
      instanceId = lastInstanceId + 1;
    } else {
      hasMore = false;
    }
  }

  return allTags;
}

/**
 * Discover all user tags, including program-scoped tags.
 * 1. Discover controller-scope tags
 * 2. Extract program names from "Program:X" entries
 * 3. Discover tags within each program
 * 4. Filter to user-created tags only
 */
export async function discoverUserTags(
  pipeline: RequestPipeline,
  sessionId: number,
  timeoutMs: number,
): Promise<DiscoveredTag[]> {
  const controllerTags = await discoverAll(pipeline, sessionId, timeoutMs);
  const programs = extractProgramNames(controllerTags);

  const programTags: DiscoveredTag[] = [];
  for (const prog of programs) {
    const tags = await discoverAll(pipeline, sessionId, timeoutMs, prog);
    programTags.push(...tags);
  }

  return [...controllerTags, ...programTags].filter(isUserTag);
}
