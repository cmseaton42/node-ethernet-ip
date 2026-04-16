/**
 * Element Segment — for array index addressing.
 * Per CIP Vol 1, Table C-4.1
 *
 * Byte layout:
 *   index <= 0xFF:    [0x28, index(UINT8)]                   = 2 bytes
 *   index <= 0xFFFF:  [0x29, 0x00(pad), index(UINT16LE)]     = 4 bytes
 *   index > 0xFFFF:   [0x2A, 0x00(pad), index(UINT32LE)]     = 6 bytes
 */
export declare function buildElementSegment(index: number): Buffer;
//# sourceMappingURL=element.d.ts.map