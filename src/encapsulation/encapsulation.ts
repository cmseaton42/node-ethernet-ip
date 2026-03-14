import { EIPCommand } from './commands';
import { buildHeader } from './header';
import { buildCPF, CPFItemType } from './common-packet-format';

/**
 * CIP protocol version for RegisterSession.
 * Per CIP Vol 2, Section 2-4.7 — always 0x0001.
 */
const CIP_PROTOCOL_VERSION = 0x0001;

/**
 * Interface Handle for CIP — always 0x00000000.
 * Per CIP Vol 2, Table 2-6.2.
 */
const CIP_INTERFACE_HANDLE = 0x00000000;

/**
 * Size of the Interface Handle + Timeout prefix
 * that precedes CPF data in SendRRData/SendUnitData.
 * Interface Handle (4 bytes) + Timeout (2 bytes) = 6 bytes.
 */
const INTERFACE_TIMEOUT_SIZE = 6;

/**
 * Offset of the Timeout field within the Interface Handle + Timeout prefix.
 */
const TIMEOUT_OFFSET = 4;

/**
 * Build a RegisterSession packet.
 * Per CIP Vol 2, Section 2-4.7
 *
 * Data payload (4 bytes):
 *   Offset  Size  Field
 *   ------  ----  -----
 *    0      2     Protocol Version  (UINT16LE) = 0x0001
 *    2      2     Option Flags      (UINT16LE) = 0x0000 (reserved)
 */
export function registerSession(): Buffer {
  const REGISTER_DATA_SIZE = 4;
  const data = Buffer.alloc(REGISTER_DATA_SIZE);

  data.writeUInt16LE(CIP_PROTOCOL_VERSION, 0); // Protocol Version
  // Option Flags at offset 2 = 0x0000 (zeroed by alloc)

  return buildHeader(EIPCommand.RegisterSession, 0, data);
}

/**
 * Build an UnregisterSession packet.
 * Per CIP Vol 2, Section 2-4.8 — no data payload.
 */
export function unregisterSession(session: number): Buffer {
  return buildHeader(EIPCommand.UnregisterSession, session);
}

/**
 * Build a SendRRData packet (unconnected messaging / UCMM).
 * Per CIP Vol 2, Section 2-4.10
 *
 * Data payload structure:
 *   Offset  Size  Field
 *   ------  ----  -----
 *    0      4     Interface Handle  (UINT32LE) = 0x00000000 (CIP)
 *    4      2     Timeout           (UINT16LE) in seconds
 *    6      N     CPF data:
 *                   Item 1: Null Address        (TypeID=0x0000, length=0)
 *                   Item 2: Unconnected Message  (TypeID=0x00B2, CIP request data)
 */
export function sendRRData(session: number, data: Buffer, timeout = 10): Buffer {
  // Build CPF: Null address item + UCMM data item
  const cpf = buildCPF([
    { typeId: CPFItemType.Null, data: Buffer.alloc(0) },
    { typeId: CPFItemType.UCMM, data },
  ]);

  // Assemble: Interface Handle + Timeout + CPF
  const payload = Buffer.alloc(INTERFACE_TIMEOUT_SIZE + cpf.length);
  payload.writeUInt32LE(CIP_INTERFACE_HANDLE, 0); // Interface Handle
  payload.writeUInt16LE(timeout, TIMEOUT_OFFSET); // Timeout (seconds)
  cpf.copy(payload, INTERFACE_TIMEOUT_SIZE); // CPF data

  return buildHeader(EIPCommand.SendRRData, session, payload);
}

/**
 * Build a SendUnitData packet (connected messaging / Class 3).
 * Per CIP Vol 2, Section 2-4.11
 *
 * NOTE: Uses ConnectionBased (0x00A1) per CIP spec for Class 3
 * explicit connected messaging. The v1 library incorrectly used
 * SequencedAddrItem (0x8002) which is for Class 1 implicit/IO.
 *
 * Data payload structure:
 *   Offset  Size  Field
 *   ------  ----  -----
 *    0      4     Interface Handle  (UINT32LE) = 0x00000000 (CIP)
 *    4      2     Timeout           (UINT16LE) = 0x0000 (always 0 for connected)
 *    6      N     CPF data:
 *                   Item 1: Connected Address  (TypeID=0x00A1)
 *                           Data: Connection ID (UINT32LE, 4 bytes)
 *                   Item 2: Connected Data     (TypeID=0x00B1)
 *                           Data: Sequence Count (UINT16LE) + CIP request data
 */
export function sendUnitData(
  session: number,
  data: Buffer,
  connectionId: number,
  sequenceCount: number,
): Buffer {
  // Item 1: Connected Address — Connection ID from Forward Open
  const CONNECTION_ID_SIZE = 4;
  const connectionIdBuf = Buffer.alloc(CONNECTION_ID_SIZE);
  connectionIdBuf.writeUInt32LE(connectionId, 0);

  // Item 2: Connected Data — Sequence Count prefix + CIP data
  const SEQUENCE_COUNT_SIZE = 2;
  const connectedData = Buffer.alloc(SEQUENCE_COUNT_SIZE + data.length);
  connectedData.writeUInt16LE(sequenceCount, 0); // Sequence Count
  data.copy(connectedData, SEQUENCE_COUNT_SIZE); // CIP request data

  // Build CPF: Connected Address + Connected Data
  const cpf = buildCPF([
    { typeId: CPFItemType.ConnectionBased, data: connectionIdBuf },
    { typeId: CPFItemType.ConnectedTransportPacket, data: connectedData },
  ]);

  // Assemble: Interface Handle + Timeout (0) + CPF
  const CONNECTED_TIMEOUT = 0; // Always 0 for connected messaging
  const payload = Buffer.alloc(INTERFACE_TIMEOUT_SIZE + cpf.length);
  payload.writeUInt32LE(CIP_INTERFACE_HANDLE, 0); // Interface Handle
  payload.writeUInt16LE(CONNECTED_TIMEOUT, TIMEOUT_OFFSET); // Timeout = 0
  cpf.copy(payload, INTERFACE_TIMEOUT_SIZE); // CPF data

  return buildHeader(EIPCommand.SendUnitData, session, payload);
}
