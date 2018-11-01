/**
 * lookup for the Redundant Owner (Vol.1 - Table 3-5.8 Field 15)
 */
const owner = {
    Exclusive: 0,
    Multiple: 1
};

/**
 * lookup for the Connection Type (Vol.1 - Table 3-5.8 Field 14,13)
 */
const connectionType = {
    Null: 0,
    Multicast: 1,
    PointToPoint: 2,
    Reserved: 3
};

/**
 * lookup for the Connection Priority (Vol.1 - Table 3-5.8 Field 11,10)
 */
const priority = {
    Low: 0,
    High: 1,
    Scheduled: 2,
    Urgent: 3
};

/**
 * lookup for the fixed or variable parameter (Vol.1 - Table 3-5.8 Field 9)
 */
const fixedVar = {
    Fixed: 0,
    Variable: 1
};

/**
 * Build for Object specific connection parameters (Vol.1 - Table 3-5.8)
 */
const build_connectionParameters = (owner, type, priority, fixedVar, size) => {
    if (owner != 0 && owner != 1) throw new Error("Owner can only be exclusive (0) or multiple (1)");
    if (type > 3 || type < 0) throw new Error("Type can only be Null(0), Multicast(1), PointToPoint(2) or Reserved(3)");
    if (priority > 3 || priority < 0) throw new Error("Priority can only be Low(0), High(1), Scheduled(2) or Urgent(3)");
    if (fixedVar != 0 && fixedVar !=1) throw new Error("Fixedvar can only be Fixed(0) or VariableI(1)");
    if (size > 10000 || size <= 1 || typeof size !== "number") throw new Error("Size must be a positive number between 1 and 10000");

    return owner << 15 | type << 13 | priority << 10 | fixedVar << 9 | size;
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
 * @param {number} [otRPI=8000] - O->T Request packet interval in milliseconds.
 * @param {number} [serialOrig=0x1337] - Originator Serial Number (SerNo of the PLC)
 * @returns {Buffer} data portion of the forwardOpen packet
 */
const build_forwardOpen = (otRPI = 8000, netConnParams = 0x43f4, timeOutMs = 1000 , timeOutMult = 32) => {
    if (timeOutMs <= 900 || typeof timeOutMs !== "number") throw new Error("Timeouts Must be Positive Integers and above 500");
    if (!(timeOutMult in timeOutMultiplier) || typeof timeOutMult !== "number") throw new Error("Timeout Multiplier must be a number and a multiple of 4");
    if (otRPI <= 8000 || typeof otRPI !== "number") throw new Error("otRPI should be at least 8000 (8ms)");
    if (typeof netConnParams !== "number") throw new Error("ConnectionParams should be created by the builder and result in a number!");

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
    connectionParams.writeUInt16LE(0x3333,ptr); // Originator VendorID
    ptr+=2;
    connectionParams.writeUInt32LE(0x1337,ptr); // Originator Serial Number
    ptr+=4;
    connectionParams.writeUInt32LE(actualMultiplier,ptr); // TimeOut Multiplier
    ptr+=4;
    connectionParams.writeUInt32LE(otRPI,ptr); // O->T RPI
    ptr+=4;
    connectionParams.writeUInt16LE(netConnParams,ptr); // O->T Network Connection Params
    ptr+=2;
    connectionParams.writeUInt32LE(otRPI,ptr); // T->O RPI
    ptr+=4;
    connectionParams.writeUInt16LE(netConnParams,ptr); // T->O Network Connection Params
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

module.exports = { build_forwardOpen,
    build_forwardClose,
    build_connectionParameters,
    connSerial,
    timePerTick,
    timeOutMultiplier,
    priority,
    owner,
    connectionType,
    fixedVar 
};
