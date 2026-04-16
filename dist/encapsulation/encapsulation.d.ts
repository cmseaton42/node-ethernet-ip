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
export declare function registerSession(): Buffer;
/**
 * Build an UnregisterSession packet.
 * Per CIP Vol 2, Section 2-4.8 — no data payload.
 */
export declare function unregisterSession(session: number): Buffer;
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
export declare function sendRRData(session: number, data: Buffer, timeout?: number): Buffer;
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
export declare function sendUnitData(session: number, data: Buffer, connectionId: number, sequenceCount: number): Buffer;
//# sourceMappingURL=encapsulation.d.ts.map