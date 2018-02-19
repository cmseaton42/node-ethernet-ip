const { Socket } = require("net");

const header = {};
const commands = {
    NOP: 0x00,
    ListServices: 0x04,
    ListIdentity: 0x63,
    ListInterfaces: 0x64,
    RegisterSession: 0x65, // Begin Session Command
    UnregisterSession: 0x66, // Close Session Command
    SendRRData: 0x6f, // Send Unconnected Data Command
    SendUnitData: 0x70, // Send Connnected Data Command
    IndicateStatus: 0x72,
    Cancel: 0x73
};

/**
 * Parses Encapulation Status Code to Human Readable Error Message.
 *
 * @param {number} status - Status Code
 * @returns {string} Human Readable Error Message
 */
const parseStatus = status => {
    if (typeof status !== "number") throw new Error("parseStatus accepts type <Number> only!");

    /* eslint-disable indent */
    switch (status) {
        case 0x00:
            return "SUCCESS";
        case 0x01:
            return "FAIL: Sender issued an invalid ecapsulation command.";
        case 0x02:
            return "FAIL: Insufficient memory resources to handle command.";
        case 0x03:
            return "FAIL: Poorly formed or incorrect data in encapsulation packet.";
        case 0x64:
            return "FAIL: Originator used an invalid session handle.";
        case 0x65:
            return "FAIL: Target received a message of invalid length.";
        case 0x69:
            return "FAIL: Unsupported encapsulation protocol revision.";
        default:
            return `FAIL: General failure <${status}> occured.`;
    }
    /* eslint-enable indent */
};

/**
 * Checks if Command is a Valid Encapsulation Command
 *
 * @param {Number} ecapsulation command
 * @returns {boolean} test result
 */
const validateCommand = cmd => {
    for (let key of Object.keys(commands)) {
        if (cmd === commands[key]) return true;
    }
    return false;
};

/**
 * Builds an ENIP Encapsolated Packet
 *
 * @param {number} cmd - Command to Send
 * @param {number} [session=0x00] - Session ID
 * @param {Buffer|Array} [data=[]] - Data to Send
 * @returns {Buffer} - Generated Buffer to be Sent to Target
 */
header.build = (cmd, session = 0x00, data = []) => {
    // Validate requested command
    if (!validateCommand(cmd)) throw new Error("Invalid Encapsulation Command!");

    const buf = Buffer.from(data);
    const send = {
        cmd: cmd,
        length: buf.length,
        session: session,
        status: 0x00,
        context: Buffer.alloc(8, 0x00),
        options: 0x00,
        data: buf
    };

    // Initialize header buffer to appropriate length
    let header = Buffer.alloc(24 + send.length);

    // Build header from encapsulation data
    header.writeInt16LE(send.cmd, 0);
    header.writeInt16LE(send.length, 2);
    header.writeInt32LE(send.session, 4);
    header.writeInt32LE(send.status, 8);
    send.context.copy(header, 12);
    header.writeInt32LE(send.options, 20);
    send.data.copy(header, 24);

    return header;
};

/**
 * @typedef EncapsulationData
 * @type {Object}
 * @property {number} commandCode - Ecapsulation Command Code
 * @property {string} command - Encapsulation Command String Interpretation
 * @property {number} length - Length of Encapsulated Data
 * @property {number} session - Session ID
 * @property {number} statusCode - Status Code
 * @property {string} status - Status Code String Interpretation
 * @property {number} options - Options (Typically 0x00)
 * @property {Buffer} data - Encapsulated Data Buffer
 */
/*****************************************************************/

/**
 * Parses an Encapsulated Packet Received from ENIP Target
 *
 * @param {Buffer} buf - Incoming Encapsulated Buffer from Target
 * @returns {EncapsulationData} - Parsed Encapsulation Data Object
 */
header.parse = buf => {
    if (!Buffer.isBuffer(buf)) throw new Error("header.parse accepts type <Buffer> only!");

    const received = {
        commandCode: buf.readInt16LE(0),
        command: null,
        length: buf.readInt16LE(2),
        session: buf.readInt32LE(4),
        statusCode: buf.readInt32LE(8),
        status: null,
        options: buf.readInt32LE(20),
        data: null
    };

    // Get Returned Encapsulated Data
    let dataBuffer = Buffer.alloc(received.length);
    buf.copy(dataBuffer, 0, 24);

    received.data = dataBuffer;
    received.status = parseStatus(received.statusCode);

    for (let key of Object.keys(commands)) {
        if (received.commandCode === commands[key]) {
            received.command = key;
            break;
        }
    }

    return received;
};

/**
 * Returns a Register Session Request String
 *
 * @returns {string} register session string
 */
const registerSession = () => {
    const { RegisterSession } = commands;
    const { build } = header;
    const cmdBuf = Buffer.alloc(4);
    cmdBuf.writeInt16LE(0x01, 0); // Protocol Version (Required to be 1)
    cmdBuf.writeInt16LE(0x00, 2); // Opton Flags (Reserved for Future List)

    // Build Register Session Buffer and return it
    return build(RegisterSession, 0x00, cmdBuf);
};

/**
 * Returns an Unregister Session Request String
 *
 * @param {number} session - Encapsulation Session ID
 * @returns {string} unregister seeion strings
 */
const unregisterSession = (client, session) => {
    const { UnregisterSession } = commands;
    const { build } = header;

    // Build Unregister Session Buffer
    return build(registerSession, session);
};

/**
 * Returns a UCMM Encapsulated Packet String
 *
 * @param {number} session - Encapsulation Session ID
 * @param {Buffer} data - Data to be Sent via UCMM
 * @param {number} [timeout=10] - Timeout (sec)
 * @returns {string} UCMM Encapsulated Message String
 */
const sendRRData = (session, data, timeout = 10) => {
    const { SendRRData } = commands;
    const { build } = header;
    const cmdBuf = Buffer.alloc(data.length + 6);
    cmdBuf.writeInt32LE(0x00, 0); // Interface Handle ID (Shall be 0 for CIP)
    cmdBuf.writeInt16LE(timeout, 4); // Timeout (sec)

    data.copy(cmdBuf, 6);

    // Build SendRRData Buffer
    return build(SendRRData, session, cmdBuf);
};

/**
 * Returns a Connected Message Datagram (Transport Class 3) String
 *
 * @param {number} session - Encapsulation Session ID
 * @param {Buffer} data - Data to be Sent via Connected Message
 * @returns {string} Connected Message Datagram String
 */
const sendUnitData = (client, session, data) => {
    const { SendUnitData } = commands;
    const { build } = header;
    const cmdBuf = Buffer.alloc(data.length + 6);
    cmdBuf.writeInt32LE(0x00, 0); // Interface Handle ID (Shall be 0 for CIP)
    cmdBuf.writeInt16LE(0x00, 4); // Timeout (sec) (Shall be 0 for Connected Messages)

    data.copy(cmdBuf, 6);

    // Build SendRRData Buffer
    return build(SendUnitData, session, cmdBuf);
};

module.exports = {
    header,
    validateCommand,
    commands,
    parseStatus,
    registerSession,
    unregisterSession,
    sendRRData,
    sendUnitData
};
