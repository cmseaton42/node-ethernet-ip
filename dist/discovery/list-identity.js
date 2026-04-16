"use strict";
/**
 * UDP device discovery — ListIdentity broadcast.
 * Per CIP Vol 2, Section 2-4.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildListIdentityRequest = buildListIdentityRequest;
exports.parseListIdentityResponse = parseListIdentityResponse;
const header_1 = require("../encapsulation/header");
const commands_1 = require("../encapsulation/commands");
/** Build a ListIdentity request packet. */
function buildListIdentityRequest() {
    return (0, header_1.buildHeader)(commands_1.EIPCommand.ListIdentity);
}
/**
 * Parse a ListIdentity response into a Device.
 * Response CPF item data layout:
 *   encapVersion(2), sinFamily(2), sinPort(2), sinAddr(4),
 *   sinZero(8), vendorId(2), deviceType(2), productCode(2),
 *   revision(2), status(2), serialNumber(4), nameLength(1), name(N), state(1)
 */
function parseListIdentityResponse(data, offset = 0) {
    let ptr = offset;
    // Skip encapsulation version
    ptr += 2;
    // Socket address
    ptr += 2; // sin_family
    ptr += 2; // sin_port
    const addr = `${data.readUInt8(ptr)}.${data.readUInt8(ptr + 1)}.${data.readUInt8(ptr + 2)}.${data.readUInt8(ptr + 3)}`;
    ptr += 4;
    ptr += 8; // sin_zero
    const vendorId = data.readUInt16LE(ptr);
    ptr += 2;
    const deviceType = data.readUInt16LE(ptr);
    ptr += 2;
    const productCode = data.readUInt16LE(ptr);
    ptr += 2;
    const major = data.readUInt8(ptr);
    ptr += 1;
    const minor = data.readUInt8(ptr);
    ptr += 1;
    const revision = `${major}.${minor}`;
    const status = data.readUInt16LE(ptr);
    ptr += 2;
    const serial = data.readUInt32LE(ptr);
    ptr += 4;
    const serialNumber = `0x${serial.toString(16)}`;
    const nameLen = data.readUInt8(ptr);
    ptr += 1;
    const productName = data.subarray(ptr, ptr + nameLen).toString('ascii');
    ptr += nameLen;
    const state = data.readUInt8(ptr);
    return {
        address: addr,
        vendorId,
        deviceType,
        productCode,
        revision,
        status,
        serialNumber,
        productName,
        state,
    };
}
//# sourceMappingURL=list-identity.js.map