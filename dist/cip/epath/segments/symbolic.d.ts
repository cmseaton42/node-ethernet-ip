/**
 * ANSI Extended Symbolic Segment — for tag name addressing.
 * Per CIP Vol 1, Appendix C-2.1
 *
 * Byte layout:
 *   [0x91, nameLength(UINT8), name(ASCII bytes), 0x00 pad if odd total]
 */
export declare function buildSymbolicSegment(name: string): Buffer;
//# sourceMappingURL=symbolic.d.ts.map