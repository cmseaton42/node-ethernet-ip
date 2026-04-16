"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIZE = exports.EIP_HEADER_SIZE = void 0;
exports.buildHeader = buildHeader;
exports.parseHeader = parseHeader;
const commands_1 = require("./commands");
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
exports.EIP_HEADER_SIZE = 24;
/** Byte offsets within the EIP header */
const OFFSET = {
    COMMAND: 0,
    LENGTH: 2,
    SESSION: 4,
    STATUS: 8,
    SENDER_CONTEXT: 12,
    OPTIONS: 20,
    DATA: 24,
};
/** Field sizes in bytes */
exports.SIZE = {
    COMMAND: 2,
    LENGTH: 2,
    SESSION: 4,
    STATUS: 4,
    SENDER_CONTEXT: 8,
    OPTIONS: 4,
};
/**
 * Build an EIP encapsulation packet (header + data payload).
 *
 * @param cmd     - EIP command code
 * @param session - Session handle (0 for RegisterSession)
 * @param data    - Data payload to encapsulate
 */
function buildHeader(cmd, session = 0, data) {
    if (!(0, commands_1.isValidCommand)(cmd)) {
        throw new Error(`Invalid EIP command: 0x${cmd.toString(16)}`);
    }
    const payload = data ? Buffer.from(data) : Buffer.alloc(0);
    const buf = Buffer.alloc(exports.EIP_HEADER_SIZE + payload.length);
    buf.writeUInt16LE(cmd, OFFSET.COMMAND); // Command code
    buf.writeUInt16LE(payload.length, OFFSET.LENGTH); // Length of data payload
    buf.writeUInt32LE(session, OFFSET.SESSION); // Session handle
    // Status (offset 8)         = 0x00 — always zero for requests
    // Sender Context (offset 12) = 0x00 — zeroed by Buffer.alloc
    // Options (offset 20)        = 0x00 — always zero
    if (payload.length > 0) {
        payload.copy(buf, OFFSET.DATA);
    }
    return buf;
}
/**
 * Parse an EIP encapsulation packet from a raw buffer.
 *
 * @param buf - Raw buffer received from target (must be >= 24 bytes)
 */
function parseHeader(buf) {
    if (buf.length < exports.EIP_HEADER_SIZE) {
        throw new Error(`Buffer too short for EIP header: ${buf.length} < ${exports.EIP_HEADER_SIZE}`);
    }
    const commandCode = buf.readUInt16LE(OFFSET.COMMAND);
    const length = buf.readUInt16LE(OFFSET.LENGTH);
    const session = buf.readUInt32LE(OFFSET.SESSION);
    const statusCode = buf.readUInt32LE(OFFSET.STATUS);
    const options = buf.readUInt32LE(OFFSET.OPTIONS);
    // Extract data payload starting after the 24-byte header
    const data = buf.subarray(OFFSET.DATA, OFFSET.DATA + length);
    return {
        commandCode,
        command: (0, commands_1.getCommandName)(commandCode),
        length,
        session,
        statusCode,
        status: (0, commands_1.parseStatus)(statusCode),
        options,
        data,
    };
}
//# sourceMappingURL=header.js.map