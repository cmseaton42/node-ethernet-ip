import { EIPCommand } from './commands';
/**
 * EIP Encapsulation Header — 24 bytes fixed size.
 * Per CIP Vol 2, Table 2-2.1 — Encapsulation Header
 *
 * Byte layout:
 *   Offset  Size  Field
 *   ------  ----  -----
 *    0      2     Command           (UINT16LE)
 *    2      2     Length            (UINT16LE) — byte count of Data field only
 *    4      4     Session Handle    (UINT32LE)
 *    8      4     Status            (UINT32LE)
 *   12      8     Sender Context    (8 bytes, echoed back by target)
 *   20      4     Options           (UINT32LE)
 *   24      N     Data              (variable length)
 */
export declare const EIP_HEADER_SIZE = 24;
/** Field sizes in bytes */
export declare const SIZE: {
    readonly COMMAND: 2;
    readonly LENGTH: 2;
    readonly SESSION: 4;
    readonly STATUS: 4;
    readonly SENDER_CONTEXT: 8;
    readonly OPTIONS: 4;
};
export interface EIPHeaderData {
    commandCode: number;
    command: string | null;
    length: number;
    session: number;
    statusCode: number;
    status: string;
    options: number;
    data: Buffer;
}
/**
 * Build an EIP encapsulation packet (header + data payload).
 *
 * @param cmd     - EIP command code
 * @param session - Session handle (0 for RegisterSession)
 * @param data    - Data payload to encapsulate
 */
export declare function buildHeader(cmd: EIPCommand, session?: number, data?: Buffer | number[]): Buffer;
/**
 * Parse an EIP encapsulation packet from a raw buffer.
 *
 * @param buf - Raw buffer received from target (must be >= 24 bytes)
 */
export declare function parseHeader(buf: Buffer): EIPHeaderData;
//# sourceMappingURL=header.d.ts.map