/**
 * lookup for the Connection Priority (Vol.1 - Table 3-5.9 Field 27,26)
 */
const priority = {
    Low: 0,
    High: 1,
    Scheduled: 10,
    Urgent: 11
};

/**
 * lookup table for Time Tick Value (Vol.1 - Table 3-5.11)
 */
const timePerTick = {
    1 : 0

};

const connSerial = 0x1337;

/**
 * lookup table for Timeout multiplier (Vol.1 - 3-5.4.1.4)
 */
const timeOutMultiplier = {
    4 : 0,
    8 : 1,
    16: 2,
    32: 3,
    64: 4,
    128: 5,
    256: 6,
    512: 7
};

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
    if (timeout <= 0 || typeof timeout !== "number")
        throw new Error("Timeouts Must be Positive Integers");

    let diff = Infinity; // let difference be very large
    let time_tick = 0;
    let ticks = 0;

    // Search for Best Timeout Encoding Values
    for (let i = 0; i < 16; i++) {
        for (let j = 1; j < 256; j++) {
            const newDiff = Math.abs(timeout - Math.pow(2, i) * j);
            if (newDiff <= diff) {
                diff = newDiff;
                time_tick = i;
                ticks = j;
            }
        }
    }

    return { time_tick, ticks };
};

/**
 * Builds the data portion of a forwardOpen packet
 *
 * @param {number} [timeOutMs=500] - How many ticks until a timeout is thrown
 * @param {number} [timeOutMult=32] - A multiplier used for the Timeout 
 * @param {number} [vendorOrig=0x3333] - Originator vendorID (Vendor of the PLC)
 * @param {number} [serialOrig=0x1337] - Originator Serial Number (SerNo of the PLC)
 * @returns {Buffer} data portion of the forwardOpen packet
 */
const build_forwardOpen = (timeOutMs = 1000 , timeOutMult = 32 , vendorOrig = 0x3333, serialOrig = 0x1337) => {
    if (timeOutMs <= 900 || typeof timeOutMs !== "number") throw new Error("Timeouts Must be Positive Integers and above 500");
    if (!(timeOutMult in timeOutMultiplier) || typeof timeOutMult !== "number") throw new Error("Timeout Multiplier must be a number and a multiple of 4");
    if (vendorOrig <= 0 || typeof vendorOrig !== "number") throw new Error("VendorOrig Must be Positive Integers");
    if (serialOrig <= 0 || typeof serialOrig !== "number") throw new Error("SerialOrig Must be Positive Integers");

    const actualMultiplier = timeOutMultiplier[timeOutMult];
    const connectionParams = Buffer.alloc(35); // Normal forward open request
    const timeout = generateEncodedTimeout(timeOutMs);
    let ptr = 0;
    connectionParams.writeUInt8(timeout.time_tick,ptr); // Priority / TimePerTick
    ptr+=1;
    connectionParams.writeUInt8(timeout.ticks,ptr); // Timeout Ticks
    ptr+=1;
    connectionParams.writeUInt32LE(0x11111111,ptr); // O->T Connection ID
    ptr+=4;
    connectionParams.writeUInt32LE(0x22222222,ptr); // T->O Connection ID
    ptr+=4;
    connectionParams.writeUInt16LE(0x4242,ptr); // Connection Serial Number TODO: Make this unique
    ptr+=2;
    connectionParams.writeUInt16LE(vendorOrig,ptr); // Originator VendorID
    ptr+=2;
    connectionParams.writeUInt32LE(serialOrig,ptr); // Originator Serial Number
    ptr+=4;
    connectionParams.writeUInt32LE(actualMultiplier,ptr); // TimeOut Multiplier
    ptr+=4;
    connectionParams.writeUInt32LE(8000,ptr); // O->T RPI
    ptr+=4;
    connectionParams.writeUInt16LE(0x43f4,ptr); // O->T Network Connection Params TODO: Create a custom parser
    ptr+=2;
    connectionParams.writeUInt32LE(8000,ptr); // T->O RPI
    ptr+=4;
    connectionParams.writeUInt16LE(0x43f4,ptr); // T->O Network Connection Params TODO: Create a custom parser
    ptr+=2;
    connectionParams.writeUInt8(0xA3,ptr); // TransportClass_Trigger (Vol.1 - 3-4.4.3) -> Target is a Server, Application object of Transport Class 3.

    return connectionParams;
};

/**
 * Builds the data portion of a forwardClose packet
 *
 * @param {number} [timeOutMs=501] - How many ms until a timeout is thrown
 * @param {number} [vendorOrig=0x3333] - Originator vendorID (Vendor of the PLC)
 * @param {number} [serialOrig=0x1337] - Originator Serial Number (SerNo of the PLC)
 * @returns {Buffer} data portion of the forwardClose packet
 */
const build_forwardClose = (timeOutMs = 1000 , vendorOrig = 0x3333, serialOrig = 0x1337) => {
    if (timeOutMs <= 900 || typeof timeOutMs !== "number") throw new Error("Timeouts Must be Positive Integers and at least 500");
    if (vendorOrig <= 0 || typeof vendorOrig !== "number") throw new Error("VendorOrig Must be Positive Integers");
    if (serialOrig <= 0 || typeof serialOrig !== "number") throw new Error("SerialOrig Must be Positive Integers");

    const connectionParams = Buffer.alloc(10);
    const timeout = generateEncodedTimeout(timeOutMs);
    let ptr = 0;
    connectionParams.writeUInt8(timeout.time_tick,ptr); // Priority / TimePerTick
    ptr+=1;
    connectionParams.writeUInt8(timeout.ticks,ptr); // Timeout Ticks
    ptr+=1;
    connectionParams.writeUInt16LE(0x4242,ptr); // Connection Serial Number TODO: Make this unique
    ptr+=2;
    connectionParams.writeUInt16LE(vendorOrig,ptr); // Originator VendorID
    ptr+=2;
    connectionParams.writeUInt32LE(serialOrig,ptr); // Originator Serial Number

    return connectionParams;
};

module.exports = { build_forwardOpen, build_forwardClose, connSerial, timePerTick, timeOutMultiplier };
