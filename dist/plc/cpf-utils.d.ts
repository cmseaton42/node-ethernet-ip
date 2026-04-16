/**
 * CPF response utilities — extract CIP data from CPF items.
 */
import { CPFItem } from '../encapsulation/common-packet-format';
/**
 * Extract CIP response data from CPF items.
 * Finds the data-carrying item (ConnectedTransportPacket or UCMM)
 * and strips the sequence count prefix for connected packets.
 */
export declare function extractCIPData(items: CPFItem[]): Buffer;
//# sourceMappingURL=cpf-utils.d.ts.map