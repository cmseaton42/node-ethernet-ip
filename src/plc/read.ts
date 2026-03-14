/**
 * Read helpers — build read requests and parse responses.
 */

import * as MessageRouter from '@/cip/message-router';
import { CIPService } from '@/cip/services';
import { getCodec, CIPDataType, isValidType } from '@/cip/data-types';
import { TagValue } from './types';
import { buildTagPath, extractBitIndex } from './tag-path';

/** Type code occupies the first 2 bytes of a read response */
const TYPE_CODE_SIZE = 2;

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
 * Parse a CIP Read Tag response into a JS value.
 * Response data: [typeCode(UINT16LE), value(N bytes)]
 */
export function parseReadResponse(
  data: Buffer,
  tagName: string,
): { type: number; value: TagValue } {
  const typeCode = data.readUInt16LE(0);
  const valueData = data.subarray(TYPE_CODE_SIZE);

  // Bit-of-word: extract single bit
  const bitIndex = extractBitIndex(tagName);
  if (bitIndex !== null && isValidType(typeCode)) {
    const codec = getCodec(typeCode as CIPDataType);
    const raw = codec.decode(valueData, 0) as number;
    return { type: typeCode, value: !!(raw & (1 << bitIndex)) };
  }

  // Unknown type (likely STRUCT) — return raw buffer
  if (!isValidType(typeCode)) {
    return { type: typeCode, value: Buffer.from(valueData) };
  }

  const codec = getCodec(typeCode as CIPDataType);
  return { type: typeCode, value: codec.decode(valueData, 0) as TagValue };
}
