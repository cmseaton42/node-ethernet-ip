"use strict";
/**
 * CPF response utilities — extract CIP data from CPF items.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCIPData = extractCIPData;
const common_packet_format_1 = require("../encapsulation/common-packet-format");
/** Sequence count prefix in connected transport packets */
const SEQUENCE_COUNT_SIZE = 2;
/**
 * Extract CIP response data from CPF items.
 * Finds the data-carrying item (ConnectedTransportPacket or UCMM)
 * and strips the sequence count prefix for connected packets.
 */
function extractCIPData(items) {
    const dataItem = items.find((i) => i.typeId === common_packet_format_1.CPFItemType.ConnectedTransportPacket || i.typeId === common_packet_format_1.CPFItemType.UCMM);
    if (!dataItem)
        throw new Error('No CIP data item in response');
    return dataItem.typeId === common_packet_format_1.CPFItemType.ConnectedTransportPacket
        ? dataItem.data.subarray(SEQUENCE_COUNT_SIZE)
        : dataItem.data;
}
//# sourceMappingURL=cpf-utils.js.map