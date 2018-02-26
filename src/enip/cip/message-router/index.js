/**
 * Builds a Message Router Request Buffer
 *
 * @param {number} service - CIP Service Code
 * @param {Buffer} path - CIP Padded EPATH (Vol 1 - Appendix C)
 * @param {Buffer} data - Service Specific Data to be Sent
 * @returns {Buffer} Message Router Request Buffer
 */
build = (service, path, data) => {
    const pathBuf = Buffer.from(path);
    const dataBuf = Buffer.from(data);

    const pathLen =
        pathBuf.length % 2 === 1 ? Math.trunc(pathBuf.length / 2) + 1 : Math.trunc(pathBuf.length);
    const buf = Buffer.alloc(2 + pathLen * 2 + dataBuf.length);

    buf.writeInt8(service, 0); // Write Service Code to Buffer <USINT>
    buf.writeInt8(pathLen, 1); // Write Length of EPATH (16 bit word length)

    pathBuf.copy(buf, 2); // Write EPATH to Buffer
    dataBuf.copy(buf, 2 + pathLen * 2); // Write Service Data to Buffer

    return buf;
};

/**
 * @typedef MessageRouter
 * @type {Object}
 * @property {number} service - Reply Service Code
 * @property {number} generalStatusCode - General Status Code (Vol 1 - Appendix B)
 * @property {number} extendedStatusLength - Length of Extended Status (In 16-bit Words)
 * @property {Array} extendedStatus - Extended Status
 * @property {Buffer} data - Status Code
 */

/**
 * Parses a Message Router Request Buffer
 *
 * @param {Buffer} buf - Message Router Request Buffer
 * @returns {MessageRouter} Decoded Message Router Object
 */
parse = buf => {
    let MessageRouter = {
        service: buf.readInt8(0),
        generalStatusCode: buf.readInt8(2),
        extendedStatusLength: buf.readInt8(3),
        extendedStatus: null,
        data: null
    };

    // Build Extended Status Array
    let arr = [];
    for (let i = 0; i < MessageRouter.extendedStatusLength; i++) {
        arr.push(buf.readInt16LE(i * 2 + 4));
    }
    MessageRouter.extendedStatus = arr;

    // Get Starting Point of Message Router Data
    const dataStart = MessageRouter.extendedStatusLength * 2 + 4;

    // Initialize Message Router Data Buffer
    let data = Buffer.alloc(buf.length - dataStart);

    // Copy Data to Message Router Data Buffer
    buf.copy(data, 0, dataStart);
    MessageRouter.data = data;

    return MessageRouter;
};

module.exports = { build, parse };
