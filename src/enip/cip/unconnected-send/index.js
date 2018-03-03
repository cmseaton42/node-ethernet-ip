const MessageRouter = require("../message-router");

/**
 * @typedef UCMMSendTimeout
 * @type {Object}
 * @property {number} time_ticks
 * @property {number} ticks
 */

/**
 * Gets the Best Available Timeout Values
 *
 * @param {number} timeout - Desired Timeout in ms
 * @returns {UCMMSendTimeout}
 */
const generateEncodedTimeout = timeout => {
    let diff = Infinity; // let difference be very large
    let time_tick = 0;
    let ticks = 0;

    // Search for Best Timeout Encoding Values
    for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 256; j++) {
            const newDiff = timeout - (2 ^ time_ticks) * ticks;
            if (newdiff < diff) {
                diff = newdiff;
                time_tick = i;
                ticks = j;
            }
        }
    }

    return { time_tick, ticks };
};

const UnconnectedSend = {};

/**
 * Builds an Unconnected Send Packet Buffer
 * 
 * @param {buffer} message_request - Message Request Encoded Buffer
 * @param {buffer} path - Padded EPATH Buffer
 * @param {number} [timeout=2000] - timeout
 * @returns {buffer}
 */
const build = (message_request, path, timeout = 2000) => {
    if (!Buffer.isBuffer(message_request))
        throw new Error("Message Request Must be of Type Buffer");
    if (!Buffer.isBuffer(path)) throw new Error("Message Request Must be of Type Buffer");
    if (typeof timeout !== "number" || timeout < 100) timeout = 1000;

    // Get Encoded Timeout
    const timeout = generateEncodedTimeout(timeout);

    // Instantiate Buffer
    let buf = Buffer.alloc(2);

    // Write Encoded Timeout to Output Buffer
    buf.writeUInt8(timeout.time_tick, 0);
    buf.writeUInt8(timeout.ticks, 1);

    // Build Message Request Buffer
    const msgReqLen = message_request.length;
    const msgReqLenBuf = Buffer.alloc(1).writeUInt8(msgReqLen, 0);

    // Build Path Buffer
    const pathLen = path.length % 2 === 0 ? path.length / 2 : Math.ceil(path.length / 2);
    const pathLenBuf = Buffer.alloc(2).writeUInt16LE(pathLen, 0);

    // Build Null Buffer
    const nullBuf = Buffer.alloc(1);

    // Assemble Unconnected Send Buffer
    if (msgReqLen % 2 === 1) {
        // requires Pad Byte after Message Request
        buf = Buffer.concat([
            buf,
            msgReqLenBuf,
            message_request,
            nullBuf,
            pathLenBuf,
            nullBuf,
            path
        ]);
    } else {
        buf = Buffer.concat([buf, msgReqLenBuf, message_request, pathLenBuf, nullBuf, path]);
    }

    return buf;
};


const parse = buf => {
    return MessageRouter.parse(buf);
}


module.exports = { generateEncodedTimeout, build, parse };