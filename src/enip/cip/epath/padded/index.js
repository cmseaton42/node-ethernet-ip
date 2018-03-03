const SegmentTypes = {
    PORT: 0 << 5, // Communication Port to Leave Node (Shall be 1 for a Backplane), Link Address of Next Device
    LOGICAL: 1 << 5,
    NETWORK: 2 << 5,
    SYMBOLIC: 3 << 5,
    DATA: 4 << 5,
    DATATYPE_1: 5 << 5,
    DATATYPE_2: 6 << 6
};

/**
 * Builds Port Segement for EPATH
 *
 * @param {number} port - Port to leave Current Node (1 if Backplane)
 * @param {number|string} link - link address to route packet
 * @returns {buffer} EPATH Segment
 */
const buildPortSegment = (port, link) => {
    if (typeof port !== "number" || port <= 0) throw new Error("Port Number must be a Positive Integer");
    if (!(typeof link === "string" || typeof link === "number") || link < 0) throw new Error("Link Number must be a Positive Integer or String");

    let buf = null;
    let portIdentifierByte = SegmentTypes.PORT; // Set High Byte of Segement (0x00)

    // Check Link Buffer Length
    let linkBuf = null;
    switch (typeof link) {
        case "string":
            linkBuf = Buffer.from(link);
            break;
        case "number":
            linkBuf = Buffer.from([link]);
            break;
    }

    // Build Port Buffer
    if (port < 15) {
        portIdentifierByte |= port;

        if (linkBuf.length > 1) {
            portIdentifierByte |= 0x10; // Set Flag to Identify a link of greater than 1 Byte
            buf = Buffer.alloc(2);
            buf.writeInt8(linkBuf.length, 1);
        } else {
            buf = Buffer.alloc(1);
        }
        
    } else {
        portIdentifierByte |= 0x0f;
        
        if (linkBuf.length > 1) {
            portIdentifierByte |= 0x10; // Set Flag to Identify a link of greater than 1 Byte
            buf = Buffer.alloc(4);
            buf.writeInt8(linkBuf.length, 1);
            buf.writeUInt16LE(port, 2);
        } else {
            buf = Buffer.alloc(3);
            buf.writeUInt16LE(port, 1);
        }
    }

    buf.writeInt8(portIdentifierByte, 0);

    // Add Link to Buffer
    buf = Buffer.concat([buf, linkBuf]); // Buffer.from(linkBuf));Buffer.alloc(1))
    return buf.length % 2 === 1 ? Buffer.concat([buf, Buffer.alloc(1)]): buf;
};

module.exports = { buildPortSegment };
