/**
 * Port Segment — for routing through backplane/ethernet.
 * Per CIP Vol 1, Appendix C — Port Segment Encoding
 *
 * Port identifier byte:
 *   bits 3-0: port number (0x0F = extended, actual port follows as UINT16LE)
 *   bit 4:    extended link flag (set when link address > 1 byte)
 *
 * Result is always padded to even length.
 */
export declare function buildPortSegment(port: number, link: number | string): Buffer;
//# sourceMappingURL=port.d.ts.map