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
 * Builds the data portion of a forwardOpen packet
 *
 * @param {number} timeOutTicks - How many ticks until a timeout is thrown
 * @param {number} timeOutMult - A multiplier used for the Timeout 
 * @param {number} vendorOrig - Originator vendorID (Vendor of the PLC)
 * @param {number} serialOrig - Originator Serial Number (SerNo of the PLC)
 * @returns {Buffer} data portion of the forwardOpen packet
 */
const build_forwardOpen = (timeOutTicks = 15 , timeOutMult = timeOutMultiplier[32] , vendorOrig = 0x3333, serialOrig = 0x1337) => {
    const connectionParams = Buffer.alloc(35);

    let ptr = 0;
    connectionParams.writeUInt8(priority.Scheduled,ptr); // Priority / TimePerTick
    ptr+=1;
    connectionParams.writeUInt8(timeOutTicks,ptr); // Timeout Ticks
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
    connectionParams.writeUInt32LE(timeOutMult,ptr); // TimeOut Multiplier
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
 * @param {number} timeOutTicks - How many ticks until a timeout is thrown
 * @param {number} vendorOrig - Originator vendorID (Vendor of the PLC)
 * @param {number} serialOrig - Originator Serial Number (SerNo of the PLC)
 * @returns {Buffer} data portion of the forwardClose packet
 */
const build_forwardClose = (timeOutTicks = 15 , vendorOrig = 0x3333, serialOrig = 0x1337) => {
    const connectionParams = Buffer.alloc(10);

    let ptr = 0;
    connectionParams.writeUInt8(priority.Scheduled,ptr); //Priority / TimePerTick
    ptr+=1;
    connectionParams.writeUInt8(timeOutTicks,ptr); //Timeout Ticks
    ptr+=1;
    connectionParams.writeUInt16LE(0x4242,ptr); // Connection Serial Number TODO: Make this unique
    ptr+=2;
    connectionParams.writeUInt16LE(vendorOrig,ptr); // Originator VendorID
    ptr+=2;
    connectionParams.writeUInt32LE(serialOrig,ptr); // Originator Serial Number

    return connectionParams;
};

module.exports = { build_forwardOpen, build_forwardClose, connSerial, timePerTick, timeOutMultiplier };
