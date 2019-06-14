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

// region Validation Helper Functions

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
// endregion

// region Compact Packet Format

/**
 * @typedef CommonPacketData
 * @type {Object}
 * @property {number} TypeID - Type of Item Encapsulated
 * @property {Buffer} data - CIP Data Buffer
 */

let CPF = {};

CPF.ItemIDs = {
    Null: 0x00,
    ListIdentity: 0x0c,
    ConnectionBased: 0xa1,
    ConnectedTransportPacket: 0xb1,
    UCMM: 0xb2,
    ListServices: 0x100,
    SockaddrO2T: 0x8000,
    SockaddrT2O: 0x8001,
    SequencedAddrItem: 0x8002
};

/**
 * Checks if Command is a Valid Encapsulation Command
 *
 * @param {Number} ecapsulation command
 * @returns {boolean} test result
 */
CPF.isCmd = cmd => {
    for (let key of Object.keys(CPF.ItemIDs)) {
        if (cmd === CPF.ItemIDs[key]) return true;
    }
    return false;
};

/**
 * Builds a Common Packet Formatted Buffer to be
 * Encapsulated.
 *
 * @param {Array} dataItems - Array of CPF Data Items
 * @returns {Buffer} CPF Buffer to be Encapsulated
 */
CPF.build = dataItems => {
    // Write Item Count and Initialize Buffer
    let buf = Buffer.alloc(2);
    buf.writeUInt16LE(dataItems.length, 0);

    for (let item of dataItems) {
        const { TypeID, data } = item;

        if (!CPF.isCmd(TypeID)) throw new Error("Invalid CPF Type ID!");

        let buf1 = Buffer.alloc(4);
        let buf2 = Buffer.from(data);

        buf1.writeUInt16LE(TypeID, 0);
        buf1.writeUInt16LE(buf2.length, 2);

        buf = buf2.length > 0 ? Buffer.concat([buf, buf1, buf2]) : Buffer.concat([buf, buf1]);
    }

    return buf;
};

/**
 * Parses Incoming Common Packet Formatted Buffer
 * and returns an Array of Objects.
 *
 * @param {Buffer} buf - Common Packet Formatted Data Buffer
 * @returns {Array} Array of Common Packet Data Objects
 */
CPF.parse = buf => {
    const itemCount = buf.readUInt16LE(0);

    let ptr = 2;
    let arr = [];

    for (let i = 0; i < itemCount; i++) {
        // Get Type ID
        const TypeID = buf.readUInt16LE(ptr);
        ptr += 2;

        // Get Data Length
        const length = buf.readUInt16LE(ptr);
        ptr += 2;

        // Get Data from Data Buffer
        const data = Buffer.alloc(length);
        buf.copy(data, 0, ptr, ptr + length);

        // Append Gathered Data Object to Return Array
        arr.push({ TypeID, data });

        ptr += length;
    }

    return arr;
};
// endregion

// region Header Assemble Method Definitions

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

let header = {};

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
    header.writeUInt16LE(send.cmd, 0);
    header.writeUInt16LE(send.length, 2);
    header.writeUInt32LE(send.session, 4);
    header.writeUInt32LE(send.status, 8);
    send.context.copy(header, 12);
    header.writeUInt32LE(send.options, 20);
    send.data.copy(header, 24);

    return header;
};

/**
 * Parses an Encapsulated Packet Received from ENIP Target
 *
 * @param {Buffer} buf - Incoming Encapsulated Buffer from Target
 * @returns {EncapsulationData} - Parsed Encapsulation Data Object
 */
header.parse = buf => {
    if (!Buffer.isBuffer(buf)) throw new Error("header.parse accepts type <Buffer> only!");

    const received = {
        commandCode: buf.readUInt16LE(0),
        command: null,
        length: buf.readUInt16LE(2),
        session: buf.readUInt32LE(4),
        statusCode: buf.readUInt32LE(8),
        status: null,
        options: buf.readUInt32LE(20),
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
// endregion

// region Common Command Helper Build Funtions

/**
 * Returns a Register Session Request String
 *
 * @returns {string} register session string
 */
const registerSession = () => {
    const { RegisterSession } = commands;
    const { build } = header;
    const cmdBuf = Buffer.alloc(4);
    cmdBuf.writeUInt16LE(0x01, 0); // Protocol Version (Required to be 1)
    cmdBuf.writeUInt16LE(0x00, 2); // Opton Flags (Reserved for Future List)

    // Build Register Session Buffer and return it
    return build(RegisterSession, 0x00, cmdBuf);
};

/**
 * Returns an Unregister Session Request String
 *
 * @param {number} session - Encapsulation Session ID
 * @returns {string} unregister seeion strings
 */
const unregisterSession = session => {
    const { UnregisterSession } = commands;
    const { build } = header;

    // Build Unregister Session Buffer
    return build(UnregisterSession, session);
};

/**
 * Returns a ListIdentity String
 *
 * @returns {string} listIdentity string
 */
const listIdentity = () => {
    const { ListIdentity } = commands;
    const { build } = header;

    // Build ListIdentity Buffer
    return build(ListIdentity, 0x00);
};

/**
 * Returns a ListServices String
 *
 * @returns {string} ListServices string
 */
const listServices = () => {
    const { ListServices} = commands;
    const { build } = header;

    // Build ListServices Buffer
    return build(ListServices, 0x00);
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

    let timeoutBuf = Buffer.alloc(6);
    timeoutBuf.writeUInt32LE(0x00, 0); // Interface Handle ID (Shall be 0 for CIP)
    timeoutBuf.writeUInt16LE(timeout, 4); // Timeout (sec)

    // Enclose in Common Packet Format
    let buf = CPF.build([
        { TypeID: CPF.ItemIDs.Null, data: Buffer.from([]) },
        { TypeID: CPF.ItemIDs.UCMM, data: data }
    ]);

    // Join Timeout Data with
    buf = Buffer.concat([timeoutBuf, buf]);

    // Build SendRRData Buffer
    return header.build(SendRRData, session, buf);
};

/**
 * Returns a Connected Message Datagram (Transport Class 3) String
 *
 * @param {number} session - Encapsulation Session ID
 * @param {Buffer} data - Data to be Sent via Connected Message
 * @param {number} ConnectionID - Connection ID from FWD_OPEN
 * @param {number} SequenceNumber - Sequence Number of Datagram
 * @returns {string} Connected Message Datagram String
 */
const sendUnitData = (session, data, ConnectionID, SequnceNumber) => {
    const { SendUnitData } = commands;

    let timeoutBuf = Buffer.alloc(6);
    timeoutBuf.writeUInt32LE(0x00, 0); // Interface Handle ID (Shall be 0 for CIP)
    timeoutBuf.writeUInt16LE(0x00, 4); // Timeout (sec) (Shall be 0 for Connected Messages)

    // Enclose in Common Packet Format
    const seqAddrBuf = Buffer.alloc(4);
    seqAddrBuf.writeUInt32LE(ConnectionID, 0);
    const seqNumberBuf = Buffer.alloc(2);
    seqNumberBuf.writeUInt16LE(SequnceNumber, 0);
    const ndata = Buffer.concat([
        seqNumberBuf,
        data
    ]);

    let buf = CPF.build([
        {
            TypeID: CPF.ItemIDs.ConnectionBased,
            data: seqAddrBuf
        },
        {
            TypeID: CPF.ItemIDs.ConnectedTransportPacket,
            data: ndata
        }
    ]);

    // Join Timeout Data with
    buf = Buffer.concat([timeoutBuf, buf]);

    // Build SendRRData Buffer
    return header.build(SendUnitData, session, buf);
};
// endregion

module.exports = {
    header,
    CPF,
    validateCommand,
    commands,
    parseStatus,
    registerSession,
    unregisterSession,
    sendRRData,
    sendUnitData,
    listIdentity,
    listServices
};
