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
const getEncodedTimeout = timeout => {
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

UnconnectedSend.build = (buffer, timeout = 2000) => {
    const { build } = MessageRouter;
    const encodedTimeout = getEncodedTimeout(timeout);

    const path

    const serviceParamLength = null;
    let buf = Buffer.alloc(5);

}
