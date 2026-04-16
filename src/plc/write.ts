/**
 * Write helpers — build write and bit-write requests.
 */

import * as MessageRouter from '@/cip/message-router';
import { CIPService } from '@/cip/services';
import { getCodec, CIPDataType, TYPE_SIZES, STRING_STRUCT_HANDLE } from '@/cip/data-types';
import { TagValue } from './types';
import { buildTagPath, extractBitIndex } from './tag-path';

/** Struct Tag Type Service Parameter marker bytes: A0 02 */
const STRUCT_MARKER_BYTE_0 = 0xa0;
const STRUCT_MARKER_BYTE_1 = 0x02;

/** Rockwell built-in STRING struct handle */

/**
 * Build a CIP Write Tag request.
 *
 * Atomic data layout:  [typeCode(2), count(2), encodedValue(N)]
 * Struct data layout:  [A0 02(2), structHandle(2), count(2), rawValue(N)]
 *
 * @param structHandle - When provided, writes 4-byte struct type param instead of 2-byte atomic
 */
export function buildWriteRequest(
  tagName: string,
  value: TagValue,
  typeCode: number,
  count = 1,
  structHandle?: number,
): Buffer {
  const path = buildTagPath(tagName);

  if (structHandle !== undefined) {
    const raw =
      structHandle === STRING_STRUCT_HANDLE && typeof value === 'string'
        ? getCodec(CIPDataType.STRING).encode(value)
        : (value as Buffer);

    const HEADER_SIZE = 6; // A0 02(2) + handle(2) + count(2)
    const data = Buffer.alloc(HEADER_SIZE + raw.length);
    data.writeUInt8(STRUCT_MARKER_BYTE_0, 0);
    data.writeUInt8(STRUCT_MARKER_BYTE_1, 1);
    data.writeUInt16LE(structHandle, 2);
    data.writeUInt16LE(count, 4);
    raw.copy(data, HEADER_SIZE);
    return MessageRouter.build(CIPService.WRITE_TAG, path, data);
  }

  // Atomic
  const codec = getCodec(typeCode as CIPDataType);
  const encoded = codec.encode(value);
  const HEADER_SIZE = 4; // typeCode(2) + count(2)
  const data = Buffer.alloc(HEADER_SIZE + encoded.length);
  data.writeUInt16LE(typeCode, 0);
  data.writeUInt16LE(count, 2);
  encoded.copy(data, HEADER_SIZE);
  return MessageRouter.build(CIPService.WRITE_TAG, path, data);
}

/**
 * Build a CIP Read Modify Write Tag request for bit-of-word writes.
 * Data layout: [maskSize(2), orMask(N), andMask(N)]
 */
export function buildBitWriteRequest(tagName: string, value: boolean, typeCode: number): Buffer {
  const path = buildTagPath(tagName);
  const bitIndex = extractBitIndex(tagName)!;
  const byteSize = TYPE_SIZES.get(typeCode as CIPDataType) ?? 4;

  const data = Buffer.alloc(2 + byteSize * 2);
  data.writeUInt16LE(byteSize, 0); // Mask size in bytes

  if (byteSize === 1) {
    data.writeUInt8(value ? 1 << bitIndex : 0, 2); // OR mask
    data.writeUInt8(value ? 0xff : 0xff & ~(1 << bitIndex), 3); // AND mask
  } else if (byteSize === 2) {
    data.writeUInt16LE(value ? 1 << bitIndex : 0, 2);
    data.writeUInt16LE(value ? 0xffff : 0xffff & ~(1 << bitIndex), 4);
  } else {
    data.writeInt32LE(value ? 1 << bitIndex : 0, 2);
    data.writeInt32LE(value ? -1 : -1 & ~(1 << bitIndex), 6);
  }

  return MessageRouter.build(CIPService.READ_MODIFY_WRITE_TAG, path, data);
}
