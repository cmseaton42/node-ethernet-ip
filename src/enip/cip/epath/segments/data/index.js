const DATA_SEGMENT = 4 << 5;

const Types = {
    Simple: 0x80,
    ANSI_EXTD: 0x91
};

/**
 * Builds EPATH Data Segment
 * 
 * @param {string|buffer} data 
 * @param {boolean} [ANSI=true] Declare if ANSI Extended or Simple
 * @returns {buffer}
 */
const build = (data, ANSI = true) => {
    if (!(typeof data === "string" || Buffer.isBuffer(data)))
        throw new Error("Data Segment Data Must be a String or Buffer");

    // Initialize Buffer
    let buf = Buffer.alloc(2);

    // Write Appropriate Segment Byte
    buf.writeUInt8(ANSI ? Types.ANSI_EXTD : Types.Simple, 0);

    // Write Appropriate Length
    buf.writeUInt8(ANSI ? data.length : Math.ceil(data.length / 2), 1);

    // Append Data
    buf = Buffer.concat([buf, Buffer.from(data)]);

    // Add Pad Byte if Odd Length
    if (buf.length % 2 === 1) buf = Buffer.concat([buf, Buffer.alloc(1)]); // Pad Odd Length Strings

    return buf;
};

module.exports = { Types, build };