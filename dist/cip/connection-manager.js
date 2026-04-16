"use strict";
/**
 * CIP Connection Manager — Forward Open / Forward Close
 * Per CIP Vol 1, Chapter 3-5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixedVar = exports.Priority = exports.ConnectionType = exports.Owner = void 0;
exports.encodeConnectionParams = encodeConnectionParams;
exports.buildForwardOpenData = buildForwardOpenData;
exports.buildLargeForwardOpenData = buildLargeForwardOpenData;
exports.buildForwardCloseData = buildForwardCloseData;
const unconnected_send_1 = require("./unconnected-send");
/** Redundant Owner — Vol 1, Table 3-5.8 Field 15 */
exports.Owner = { Exclusive: 0, Multiple: 1 };
/** Connection Type — Vol 1, Table 3-5.8 Fields 14-13 */
exports.ConnectionType = { Null: 0, Multicast: 1, PointToPoint: 2 };
/** Priority — Vol 1, Table 3-5.8 Fields 11-10 */
exports.Priority = { Low: 0, High: 1, Scheduled: 2, Urgent: 3 };
/** Fixed/Variable — Vol 1, Table 3-5.8 Field 9 */
exports.FixedVar = { Fixed: 0, Variable: 1 };
/** Timeout Multiplier lookup — Vol 1, Section 3-5.4.1.4 */
const TIMEOUT_MULTIPLIER = {
    4: 0,
    8: 1,
    16: 2,
    32: 3,
    64: 4,
    128: 5,
    256: 6,
    512: 7,
};
/**
 * Transport Class Trigger byte for Class 3 connected messaging.
 * Vol 1, Section 3-4.4.3 — Target is Server, Application object, Transport Class 3.
 */
const TRANSPORT_CLASS_3_SERVER = 0xa3;
/**
 * Encode network connection parameters into a 16-bit value.
 * Per CIP Vol 1, Table 3-5.8
 *
 * Bit layout:
 *   15:    Redundant Owner
 *   14-13: Connection Type
 *   12:    Reserved (0)
 *   11-10: Priority
 *   9:     Fixed/Variable
 *   8-0:   Connection Size
 */
function encodeConnectionParams(owner, type, priority, fixedVar, size) {
    return (owner << 15) | (type << 13) | (priority << 10) | (fixedVar << 9) | size;
}
/**
 * Build the data portion of a Forward Open request.
 * Per CIP Vol 1, Table 3-5.16 (Small Forward Open)
 *
 * Layout (35 bytes):
 *   [timeTick(1), ticks(1),
 *    otConnId(4), toConnId(4),
 *    connSerial(2), vendorId(2), originatorSerial(4),
 *    timeoutMultiplier(4),
 *    otRPI(4), otParams(2),
 *    toRPI(4), toParams(2),
 *    transportTrigger(1)]
 */
function buildForwardOpenData(opts = {}) {
    const rpi = opts.rpiMicroseconds ?? 60000;
    const connParams = opts.connectionParams ??
        encodeConnectionParams(exports.Owner.Exclusive, exports.ConnectionType.PointToPoint, exports.Priority.Low, exports.FixedVar.Variable, 500);
    const timeoutMs = opts.timeoutMs ?? 1000;
    const timeoutMult = opts.timeoutMultiplier ?? 512;
    const connSerial = opts.connectionSerial ?? Math.floor(Math.random() * 0x7fff);
    const toConnId = opts.toConnectionId ?? Math.floor(Math.random() * 0x7fffffff);
    const vendorId = opts.vendorId ?? 0x3333;
    const originatorSerial = opts.originatorSerial ?? 0x1337;
    const multiplierValue = TIMEOUT_MULTIPLIER[timeoutMult] ?? 0;
    const timeout = (0, unconnected_send_1.encodeTimeout)(timeoutMs);
    const FORWARD_OPEN_DATA_SIZE = 35;
    const buf = Buffer.alloc(FORWARD_OPEN_DATA_SIZE);
    let ptr = 0;
    buf.writeUInt8(timeout.timeTick, ptr);
    ptr += 1; // Priority / Time Tick
    buf.writeUInt8(timeout.ticks, ptr);
    ptr += 1; // Timeout Ticks
    buf.writeUInt32LE(0, ptr);
    ptr += 4; // O→T Connection ID (0 = PLC assigns)
    buf.writeUInt32LE(toConnId, ptr);
    ptr += 4; // T→O Connection ID
    buf.writeUInt16LE(connSerial, ptr);
    ptr += 2; // Connection Serial Number
    buf.writeUInt16LE(vendorId, ptr);
    ptr += 2; // Originator Vendor ID
    buf.writeUInt32LE(originatorSerial, ptr);
    ptr += 4; // Originator Serial Number
    buf.writeUInt32LE(multiplierValue, ptr);
    ptr += 4; // Timeout Multiplier
    buf.writeUInt32LE(rpi, ptr);
    ptr += 4; // O→T RPI (microseconds)
    buf.writeUInt16LE(connParams, ptr);
    ptr += 2; // O→T Network Connection Params
    buf.writeUInt32LE(rpi, ptr);
    ptr += 4; // T→O RPI (microseconds)
    buf.writeUInt16LE(connParams, ptr);
    ptr += 2; // T→O Network Connection Params
    buf.writeUInt8(TRANSPORT_CLASS_3_SERVER, ptr); // Transport Class Trigger
    return buf;
}
/**
 * Build the data portion of a Large Forward Open request.
 * Per CIP Vol 1, Table 3-5.16 (Large Forward Open)
 *
 * Same as Forward Open but connection params are 32-bit instead of 16-bit.
 * Layout (39 bytes).
 */
function buildLargeForwardOpenData(opts = {}) {
    const rpi = opts.rpiMicroseconds ?? 60000;
    const size = opts.connectionParams ?? 4002;
    // Large format: connection params are 32-bit with size in low 16 bits
    const connParams = encodeConnectionParams(exports.Owner.Exclusive, exports.ConnectionType.PointToPoint, exports.Priority.Low, exports.FixedVar.Variable, 0);
    const largeParams = (connParams << 16) | size;
    const timeoutMs = opts.timeoutMs ?? 1000;
    const timeoutMult = opts.timeoutMultiplier ?? 512;
    const connSerial = opts.connectionSerial ?? Math.floor(Math.random() * 0x7fff);
    const toConnId = opts.toConnectionId ?? Math.floor(Math.random() * 0x7fffffff);
    const vendorId = opts.vendorId ?? 0x3333;
    const originatorSerial = opts.originatorSerial ?? 0x1337;
    const multiplierValue = TIMEOUT_MULTIPLIER[timeoutMult] ?? 0;
    const timeout = (0, unconnected_send_1.encodeTimeout)(timeoutMs);
    const LARGE_FORWARD_OPEN_DATA_SIZE = 39;
    const buf = Buffer.alloc(LARGE_FORWARD_OPEN_DATA_SIZE);
    let ptr = 0;
    buf.writeUInt8(timeout.timeTick, ptr);
    ptr += 1;
    buf.writeUInt8(timeout.ticks, ptr);
    ptr += 1;
    buf.writeUInt32LE(0, ptr);
    ptr += 4; // O→T Connection ID
    buf.writeUInt32LE(toConnId, ptr);
    ptr += 4; // T→O Connection ID
    buf.writeUInt16LE(connSerial, ptr);
    ptr += 2;
    buf.writeUInt16LE(vendorId, ptr);
    ptr += 2;
    buf.writeUInt32LE(originatorSerial, ptr);
    ptr += 4;
    buf.writeUInt32LE(multiplierValue, ptr);
    ptr += 4;
    buf.writeUInt32LE(rpi, ptr);
    ptr += 4; // O→T RPI
    buf.writeUInt32LE(largeParams, ptr);
    ptr += 4; // O→T Params (32-bit)
    buf.writeUInt32LE(rpi, ptr);
    ptr += 4; // T→O RPI
    buf.writeUInt32LE(largeParams, ptr);
    ptr += 4; // T→O Params (32-bit)
    buf.writeUInt8(TRANSPORT_CLASS_3_SERVER, ptr);
    return buf;
}
/**
 * Build the data portion of a Forward Close request.
 * Per CIP Vol 1, Table 3-5.22
 *
 * Layout (10 bytes):
 *   [timeTick(1), ticks(1), connSerial(2), vendorId(2), originatorSerial(4)]
 */
function buildForwardCloseData(opts) {
    const timeoutMs = opts.timeoutMs ?? 1000;
    const vendorId = opts.vendorId ?? 0x3333;
    const originatorSerial = opts.originatorSerial ?? 0x1337;
    const timeout = (0, unconnected_send_1.encodeTimeout)(timeoutMs);
    const FORWARD_CLOSE_DATA_SIZE = 10;
    const buf = Buffer.alloc(FORWARD_CLOSE_DATA_SIZE);
    let ptr = 0;
    buf.writeUInt8(timeout.timeTick, ptr);
    ptr += 1;
    buf.writeUInt8(timeout.ticks, ptr);
    ptr += 1;
    buf.writeUInt16LE(opts.connectionSerial, ptr);
    ptr += 2;
    buf.writeUInt16LE(vendorId, ptr);
    ptr += 2;
    buf.writeUInt32LE(originatorSerial, ptr);
    return buf;
}
//# sourceMappingURL=connection-manager.js.map