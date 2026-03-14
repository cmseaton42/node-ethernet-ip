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
export enum CPFItemType {
  /** Null address item — used as placeholder in unconnected messages */
  Null = 0x0000,
  /** List Identity response item */
  ListIdentity = 0x000c,
  /** Connected Address Item — carries Connection ID for Class 3 connected messaging */
  ConnectionBased = 0x00a1,
  /** Connected Data Item — carries CIP data for connected messaging */
  ConnectedTransportPacket = 0x00b1,
  /** Unconnected Message (UCMM) — carries CIP data for unconnected messaging */
  UCMM = 0x00b2,
  /** List Services response item */
  ListServices = 0x0100,
  /** Sockaddr Info O→T */
  SockaddrO2T = 0x8000,
  /** Sockaddr Info T→O */
  SockaddrT2O = 0x8001,
  /** Sequenced Address Item — used for Class 1 implicit (I/O) messaging */
  SequencedAddrItem = 0x8002,
}

export interface CPFItem {
  typeId: CPFItemType;
  data: Buffer;
}

/** Size of a single CPF item header (Type ID + Data Length) */
const CPF_ITEM_HEADER_SIZE = 4;

/** Size of the CPF item count field */
const CPF_COUNT_SIZE = 2;

/**
 * Build a CPF buffer from an array of typed items.
 */
export function buildCPF(items: CPFItem[]): Buffer {
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
export function parseCPF(buf: Buffer): CPFItem[] {
  const count = buf.readUInt16LE(0); // Item Count
  const items: CPFItem[] = [];
  let offset = CPF_COUNT_SIZE;

  for (let i = 0; i < count; i++) {
    const typeId = buf.readUInt16LE(offset) as CPFItemType; // Type ID
    offset += 2;

    const length = buf.readUInt16LE(offset); // Data Length
    offset += 2;

    const data = buf.subarray(offset, offset + length); // Data payload
    items.push({ typeId, data });
    offset += length;
  }

  return items;
}
