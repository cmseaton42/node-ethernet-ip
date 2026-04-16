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
/** Logical Segment Types — bits 4-2 of the segment byte */
export declare enum LogicalType {
    ClassID = 0,//     0 << 2
    InstanceID = 4,//  1 << 2
    MemberID = 8,//    2 << 2
    ConnPoint = 12,//   3 << 2
    AttributeID = 16,// 4 << 2
    Special = 20,//     5 << 2
    ServiceID = 24
}
/**
 * Build a Logical Segment buffer.
 * Address 0 is valid (e.g. Instance 0 for tag list discovery).
 */
export declare function buildLogicalSegment(type: LogicalType, address: number): Buffer;
//# sourceMappingURL=logical.d.ts.map