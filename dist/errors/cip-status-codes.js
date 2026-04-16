"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CIP_STATUS_CODES = void 0;
exports.getStatusMessage = getStatusMessage;
/**
 * CIP General Status Codes
 * Per CIP Vol 1, Appendix B — Table B-1.1
 */
exports.CIP_STATUS_CODES = {
    0x00: 'Success',
    0x01: 'Connection failure',
    0x02: 'Resource unavailable',
    0x03: 'Invalid parameter value',
    0x04: 'Path segment error',
    0x05: 'Path destination unknown',
    0x06: 'Partial transfer',
    0x07: 'Connection lost',
    0x08: 'Service not supported',
    0x09: 'Invalid attribute value',
    0x0a: 'Attribute list error',
    0x0b: 'Already in requested mode/state',
    0x0c: 'Object state conflict',
    0x0d: 'Object already exists',
    0x0e: 'Attribute not settable',
    0x0f: 'Privilege violation',
    0x10: 'Device state conflict',
    0x11: 'Reply data too large',
    0x12: 'Fragmentation of a primitive value',
    0x13: 'Not enough data',
    0x14: 'Attribute not supported',
    0x15: 'Too much data',
    0x16: 'Object does not exist',
    0x17: 'Service fragmentation sequence not in progress',
    0x18: 'No stored attribute data',
    0x19: 'Store operation failure',
    0x1a: 'Routing failure, request packet too large',
    0x1b: 'Routing failure, response packet too large',
    0x1c: 'Missing attribute list entry data',
    0x1d: 'Invalid attribute value list',
    0x1e: 'Embedded service error',
    0x1f: 'Vendor specific error',
    0x20: 'Invalid parameter',
    0x21: 'Write-once value or medium already written',
    0x22: 'Invalid reply received',
    0x25: 'Key failure in path',
    0x26: 'Path size invalid',
    0x27: 'Unexpected attribute in list',
    0x28: 'Invalid Member ID',
    0x29: 'Member not settable',
    0x2a: 'Group 2 only server general failure',
    0x2b: 'Unknown Modbus error',
    0x2c: 'Attribute not gettable',
};
function getStatusMessage(code) {
    return exports.CIP_STATUS_CODES[code] ?? `Unknown status (0x${code.toString(16)})`;
}
//# sourceMappingURL=cip-status-codes.js.map