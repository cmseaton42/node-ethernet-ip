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
/** CPF Item Type IDs — Per CIP Vol 2, Table 2-6.1 */
export declare enum CPFItemType {
    /** Null address item — used as placeholder in unconnected messages */
    Null = 0,
    /** List Identity response item */
    ListIdentity = 12,
    /** Connected Address Item — carries Connection ID for Class 3 connected messaging */
    ConnectionBased = 161,
    /** Connected Data Item — carries CIP data for connected messaging */
    ConnectedTransportPacket = 177,
    /** Unconnected Message (UCMM) — carries CIP data for unconnected messaging */
    UCMM = 178,
    /** List Services response item */
    ListServices = 256,
    /** Sockaddr Info O→T */
    SockaddrO2T = 32768,
    /** Sockaddr Info T→O */
    SockaddrT2O = 32769,
    /** Sequenced Address Item — used for Class 1 implicit (I/O) messaging */
    SequencedAddrItem = 32770
}
export interface CPFItem {
    typeId: CPFItemType;
    data: Buffer;
}
/**
 * Build a CPF buffer from an array of typed items.
 */
export declare function buildCPF(items: CPFItem[]): Buffer;
/**
 * Parse a CPF buffer into an array of typed items.
 */
export declare function parseCPF(buf: Buffer): CPFItem[];
//# sourceMappingURL=common-packet-format.d.ts.map