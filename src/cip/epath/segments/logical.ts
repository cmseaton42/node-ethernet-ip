/**
 * Logical Segment
 * Per CIP Vol 1, Appendix C — Table C-1.3
 *
 * Segment byte = SEGMENT_TYPE_LOGICAL(0x20) | LogicalType(bits 4-2) | Format(bits 1-0)
 *
 * Format determines address size:
 *   0 = 8-bit:  [segByte, address(UINT8)]                    = 2 bytes
 *   1 = 16-bit: [segByte, 0x00(pad), address(UINT16LE)]      = 4 bytes (padded)
 *   2 = 32-bit: [segByte, 0x00(pad), address(UINT32LE)]      = 6 bytes (padded)
 */

/** Segment type identifier for Logical segments (bits 7-5 = 001) */
const SEGMENT_TYPE_LOGICAL = 0x20;

/** Logical Segment Types — bits 4-2 of the segment byte */
export enum LogicalType {
  ClassID = 0x00, //     0 << 2
  InstanceID = 0x04, //  1 << 2
  MemberID = 0x08, //    2 << 2
  ConnPoint = 0x0c, //   3 << 2
  AttributeID = 0x10, // 4 << 2
  Special = 0x14, //     5 << 2
  ServiceID = 0x18, //   6 << 2
}

/** Address format — bits 1-0 of the segment byte */
const FORMAT = {
  EIGHT_BIT: 0,
  SIXTEEN_BIT: 1,
  THIRTY_TWO_BIT: 2,
} as const;

/**
 * Build a Logical Segment buffer.
 * Address 0 is valid (e.g. Instance 0 for tag list discovery).
 */
export function buildLogicalSegment(type: LogicalType, address: number): Buffer {
  if (address < 0 || !Number.isInteger(address)) {
    throw new Error(`Logical segment address must be a non-negative integer, got ${address}`);
  }

  let format: number;
  let buf: Buffer;

  if (address <= 0xff) {
    format = FORMAT.EIGHT_BIT;
    buf = Buffer.alloc(2);
    buf.writeUInt8(address, 1);
  } else if (address <= 0xffff) {
    format = FORMAT.SIXTEEN_BIT;
    buf = Buffer.alloc(4);
    // pad byte at offset 1 already 0x00 from alloc
    buf.writeUInt16LE(address, 2);
  } else {
    format = FORMAT.THIRTY_TWO_BIT;
    buf = Buffer.alloc(6);
    // pad byte at offset 1 already 0x00 from alloc
    buf.writeUInt32LE(address, 2);
  }

  // Assemble segment byte: type(7-5) | logicalType(4-2) | format(1-0)
  buf.writeUInt8(SEGMENT_TYPE_LOGICAL | type | format, 0);

  return buf;
}
