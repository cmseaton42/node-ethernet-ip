/**
 * Read helpers — build read requests and parse responses.
 */

import * as MessageRouter from '@/cip/message-router';
import { CIPService } from '@/cip/services';
import { getCodec, CIPDataType, isValidType, STRING_STRUCT_HANDLE } from '@/cip/data-types';
import { TagValue } from './types';
import { buildTagPath, extractBitIndex } from './tag-path';

/** Struct Tag Type Service Parameter marker bytes on the wire: A0 02 */
const STRUCT_MARKER_BYTE_0 = 0xa0;
const STRUCT_MARKER_BYTE_1 = 0x02;

/** Atomic type param: 2 bytes (type + 0x00 pad). Struct: 4 bytes (A0 02 + handle). */
const ATOMIC_TYPE_SIZE = 2;
const STRUCT_TYPE_SIZE = 4;

/**
 * Build a CIP Read Tag request.
 */
export function buildReadRequest(tagName: string, count = 1): Buffer {
  const path = buildTagPath(tagName);
  const data = Buffer.alloc(2);
  data.writeUInt16LE(count, 0); // Element count
  return MessageRouter.build(CIPService.READ_TAG, path, data);
}

/**
 * Detect struct type marker (wire bytes A0 02).
 */
export function isStructTypeParam(data: Buffer): boolean {
  return data[0] === STRUCT_MARKER_BYTE_0 && data[1] === STRUCT_MARKER_BYTE_1;
}

/** Rockwell built-in STRING struct handle — STRING tags report as struct, not atomic 0xD0.
 *  Custom string UDTs (e.g. STRING20) will have different handles and need template retrieval. */

/**
 * Parse a CIP Read Tag response into a JS value.
 *
 * Atomic response data:  [typeCode(2), value(N)]
 * Struct response data:  [A0 02(2), structHandle(2), value(N)]
 */
export function parseReadResponse(
  data: Buffer,
  tagName: string,
): { type: number; isStruct: boolean; value: TagValue } {
  if (data.length < ATOMIC_TYPE_SIZE) {
    throw new Error(`Read response too short (${data.length} bytes) for tag "${tagName}"`);
  }

  const isStruct = isStructTypeParam(data);
  const typeCode = isStruct ? data.readUInt16LE(2) : data.readUInt16LE(0);
  const valueData = data.subarray(isStruct ? STRUCT_TYPE_SIZE : ATOMIC_TYPE_SIZE);

  // Bit-of-word: extract single bit (atomics only)
  const bitIndex = extractBitIndex(tagName);
  if (bitIndex !== null && !isStruct && isValidType(typeCode)) {
    const codec = getCodec(typeCode as CIPDataType);
    const raw = codec.decode(valueData, 0) as number;
    return { type: typeCode, isStruct: false, value: !!(raw & (1 << bitIndex)) };
  }

  // STRING special case: built-in STRING struct handle 0x0FCE
  if (isStruct && typeCode === STRING_STRUCT_HANDLE) {
    const codec = getCodec(CIPDataType.STRING);
    return { type: typeCode, isStruct: true, value: codec.decode(valueData, 0) as string };
  }

  // Other struct or unknown type — return raw buffer
  if (isStruct || !isValidType(typeCode)) {
    return { type: typeCode, isStruct, value: Buffer.from(valueData) };
  }

  const codec = getCodec(typeCode as CIPDataType);
  return { type: typeCode, isStruct: false, value: codec.decode(valueData, 0) as TagValue };
}
