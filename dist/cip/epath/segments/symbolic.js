"use strict";
/**
 * ANSI Extended Symbolic Segment — for tag name addressing.
 * Per CIP Vol 1, Appendix C-2.1
 *
 * Byte layout:
 *   [0x91, nameLength(UINT8), name(ASCII bytes), 0x00 pad if odd total]
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSymbolicSegment = buildSymbolicSegment;
/** ANSI Extended Symbolic segment identifier byte */
const ANSI_EXTENDED_SYMBOLIC = 0x91;
/** Size of the segment header (type byte + length byte) */
const HEADER_SIZE = 2;
function buildSymbolicSegment(name) {
    const nameBytes = Buffer.from(name, 'ascii');
    const totalSize = HEADER_SIZE + nameBytes.length;
    const paddedSize = totalSize % 2 === 0 ? totalSize : totalSize + 1;
    const buf = Buffer.alloc(paddedSize);
    buf.writeUInt8(ANSI_EXTENDED_SYMBOLIC, 0); // Segment type
    buf.writeUInt8(nameBytes.length, 1); // Name length in bytes
    nameBytes.copy(buf, HEADER_SIZE); // Name ASCII bytes
    // Pad byte (if needed) already 0x00 from alloc
    return buf;
}
//# sourceMappingURL=symbolic.js.map