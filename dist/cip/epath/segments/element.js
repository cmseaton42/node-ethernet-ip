"use strict";
/**
 * Element Segment — for array index addressing.
 * Per CIP Vol 1, Table C-4.1
 *
 * Byte layout:
 *   index <= 0xFF:    [0x28, index(UINT8)]                   = 2 bytes
 *   index <= 0xFFFF:  [0x29, 0x00(pad), index(UINT16LE)]     = 4 bytes
 *   index > 0xFFFF:   [0x2A, 0x00(pad), index(UINT32LE)]     = 6 bytes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildElementSegment = buildElementSegment;
/** Element segment type bytes */
const ELEMENT_TYPE = {
    UINT8: 0x28,
    UINT16: 0x29,
    UINT32: 0x2a,
};
function buildElementSegment(index) {
    if (index < 0 || !Number.isInteger(index)) {
        throw new Error(`Element index must be a non-negative integer, got ${index}`);
    }
    if (index <= 0xff) {
        const buf = Buffer.alloc(2);
        buf.writeUInt8(ELEMENT_TYPE.UINT8, 0);
        buf.writeUInt8(index, 1);
        return buf;
    }
    else if (index <= 0xffff) {
        const buf = Buffer.alloc(4);
        buf.writeUInt8(ELEMENT_TYPE.UINT16, 0);
        // pad byte at offset 1 already 0x00
        buf.writeUInt16LE(index, 2);
        return buf;
    }
    else {
        const buf = Buffer.alloc(6);
        buf.writeUInt8(ELEMENT_TYPE.UINT32, 0);
        // pad byte at offset 1 already 0x00
        buf.writeUInt32LE(index, 2);
        return buf;
    }
}
//# sourceMappingURL=element.js.map