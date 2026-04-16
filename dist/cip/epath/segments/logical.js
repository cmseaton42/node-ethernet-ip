"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogicalType = void 0;
exports.buildLogicalSegment = buildLogicalSegment;
/** Segment type identifier for Logical segments (bits 7-5 = 001) */
const SEGMENT_TYPE_LOGICAL = 0x20;
/** Logical Segment Types — bits 4-2 of the segment byte */
var LogicalType;
(function (LogicalType) {
    LogicalType[LogicalType["ClassID"] = 0] = "ClassID";
    LogicalType[LogicalType["InstanceID"] = 4] = "InstanceID";
    LogicalType[LogicalType["MemberID"] = 8] = "MemberID";
    LogicalType[LogicalType["ConnPoint"] = 12] = "ConnPoint";
    LogicalType[LogicalType["AttributeID"] = 16] = "AttributeID";
    LogicalType[LogicalType["Special"] = 20] = "Special";
    LogicalType[LogicalType["ServiceID"] = 24] = "ServiceID";
})(LogicalType || (exports.LogicalType = LogicalType = {}));
/** Address format — bits 1-0 of the segment byte */
const FORMAT = {
    EIGHT_BIT: 0,
    SIXTEEN_BIT: 1,
    THIRTY_TWO_BIT: 2,
};
/**
 * Build a Logical Segment buffer.
 * Address 0 is valid (e.g. Instance 0 for tag list discovery).
 */
function buildLogicalSegment(type, address) {
    if (address < 0 || !Number.isInteger(address)) {
        throw new Error(`Logical segment address must be a non-negative integer, got ${address}`);
    }
    let format;
    let buf;
    if (address <= 0xff) {
        format = FORMAT.EIGHT_BIT;
        buf = Buffer.alloc(2);
        buf.writeUInt8(address, 1);
    }
    else if (address <= 0xffff) {
        format = FORMAT.SIXTEEN_BIT;
        buf = Buffer.alloc(4);
        // pad byte at offset 1 already 0x00 from alloc
        buf.writeUInt16LE(address, 2);
    }
    else {
        format = FORMAT.THIRTY_TWO_BIT;
        buf = Buffer.alloc(6);
        // pad byte at offset 1 already 0x00 from alloc
        buf.writeUInt32LE(address, 2);
    }
    // Assemble segment byte: type(7-5) | logicalType(4-2) | format(1-0)
    buf.writeUInt8(SEGMENT_TYPE_LOGICAL | type | format, 0);
    return buf;
}
//# sourceMappingURL=logical.js.map