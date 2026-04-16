"use strict";
/**
 * Common Packet Format (CPF)
 * Per CIP Vol 2, Section 2-6 — Common Packet Format
 *
 * CPF encodes a variable number of typed data items:
 *   Offset  Size  Field
 *   ------  ----  -----
 *    0      2     Item Count    (UINT16LE)
 *   For each item:
 *    +0     2     Type ID       (UINT16LE)
 *    +2     2     Data Length   (UINT16LE)
 *    +4     N     Data          (variable)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CPFItemType = void 0;
exports.buildCPF = buildCPF;
exports.parseCPF = parseCPF;
/** CPF Item Type IDs — Per CIP Vol 2, Table 2-6.1 */
var CPFItemType;
(function (CPFItemType) {
    /** Null address item — used as placeholder in unconnected messages */
    CPFItemType[CPFItemType["Null"] = 0] = "Null";
    /** List Identity response item */
    CPFItemType[CPFItemType["ListIdentity"] = 12] = "ListIdentity";
    /** Connected Address Item — carries Connection ID for Class 3 connected messaging */
    CPFItemType[CPFItemType["ConnectionBased"] = 161] = "ConnectionBased";
    /** Connected Data Item — carries CIP data for connected messaging */
    CPFItemType[CPFItemType["ConnectedTransportPacket"] = 177] = "ConnectedTransportPacket";
    /** Unconnected Message (UCMM) — carries CIP data for unconnected messaging */
    CPFItemType[CPFItemType["UCMM"] = 178] = "UCMM";
    /** List Services response item */
    CPFItemType[CPFItemType["ListServices"] = 256] = "ListServices";
    /** Sockaddr Info O→T */
    CPFItemType[CPFItemType["SockaddrO2T"] = 32768] = "SockaddrO2T";
    /** Sockaddr Info T→O */
    CPFItemType[CPFItemType["SockaddrT2O"] = 32769] = "SockaddrT2O";
    /** Sequenced Address Item — used for Class 1 implicit (I/O) messaging */
    CPFItemType[CPFItemType["SequencedAddrItem"] = 32770] = "SequencedAddrItem";
})(CPFItemType || (exports.CPFItemType = CPFItemType = {}));
/** Size of a single CPF item header (Type ID + Data Length) */
const CPF_ITEM_HEADER_SIZE = 4;
/** Size of the CPF item count field */
const CPF_COUNT_SIZE = 2;
/**
 * Build a CPF buffer from an array of typed items.
 */
function buildCPF(items) {
    // Calculate total buffer size: item count + (item header + data) for each item
    let totalSize = CPF_COUNT_SIZE;
    for (const item of items) {
        totalSize += CPF_ITEM_HEADER_SIZE + item.data.length;
    }
    const buf = Buffer.alloc(totalSize);
    let offset = 0;
    // Item Count (UINT16LE)
    buf.writeUInt16LE(items.length, offset);
    offset += CPF_COUNT_SIZE;
    for (const item of items) {
        // Type ID (UINT16LE)
        buf.writeUInt16LE(item.typeId, offset);
        offset += 2;
        // Data Length (UINT16LE)
        buf.writeUInt16LE(item.data.length, offset);
        offset += 2;
        // Data payload
        item.data.copy(buf, offset);
        offset += item.data.length;
    }
    return buf;
}
/**
 * Parse a CPF buffer into an array of typed items.
 */
function parseCPF(buf) {
    const count = buf.readUInt16LE(0); // Item Count
    const items = [];
    let offset = CPF_COUNT_SIZE;
    for (let i = 0; i < count; i++) {
        const typeId = buf.readUInt16LE(offset); // Type ID
        offset += 2;
        const length = buf.readUInt16LE(offset); // Data Length
        offset += 2;
        const data = buf.subarray(offset, offset + length); // Data payload
        items.push({ typeId, data });
        offset += length;
    }
    return items;
}
//# sourceMappingURL=common-packet-format.js.map