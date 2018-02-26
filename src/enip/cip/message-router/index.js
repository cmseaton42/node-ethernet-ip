const MR = {}; // message router

/**
 * Builds a Message Router Request Buffer
 *
 * @param {number} service - CIP Service Code
 * @param {Buffer} path - CIP Padded EPATH (Vol 1 - Appendix C)
 * @param {Buffer} data - Service Specific Data to be Sent
 * @returns {Buffer} Message Router Request Buffer
 */
MR.build = (service, path, data) => {
    const pathBuf = Buffer.from(path);
    const dataBuf = Buffer.from(data);

    const buf = Buffer.alloc(2 + pathBuf.length + dataBuf.length);

    buf.writeInt8(service); // Write Service Code to Buffer <USINT>
    buf.writeInt8( // Write Length of EPATH (16 bit word length)
        pathBuf.length % 2 === 1 ? Math.round(pathBuf.length / 2) + 1 : Math.round(pathBuf.length)
    );

    pathBuf.copy(buf, 2); // Write EPATH to Buffer
    dataBuf.copy(buf, 2 + pathBuf.length); // Write Service Data to Buffer

    return buf;
};


module.exports = { MR };
