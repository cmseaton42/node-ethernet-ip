"use strict";
/**
 * Wall Clock — Get/Set Attribute Single on WallClock Object.
 * Per CIP Vol 1 — WallClock Object (Class 0x8B, Instance 0x01, Attribute 0x05)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReadWallClockRequest = buildReadWallClockRequest;
exports.parseWallClockResponse = parseWallClockResponse;
exports.buildWriteWallClockRequest = buildWriteWallClockRequest;
const MessageRouter = __importStar(require("../cip/message-router"));
const services_1 = require("../cip/services");
const epath_1 = require("../cip/epath");
/** WallClock Object: Class 0x8B, Instance 0x01, Attribute 0x05 (Local Time) */
const WALL_CLOCK_PATH = new epath_1.EPathBuilder()
    .logical(epath_1.LogicalType.ClassID, 0x8b)
    .logical(epath_1.LogicalType.InstanceID, 0x01)
    .logical(epath_1.LogicalType.AttributeID, 0x05)
    .build();
/** Number of UINT32LE fields in the wall clock response */
const CLOCK_FIELDS = 7;
function buildReadWallClockRequest() {
    return MessageRouter.build(services_1.CIPService.GET_ATTRIBUTE_SINGLE, WALL_CLOCK_PATH, Buffer.alloc(0));
}
/** Parse wall clock response into a Date. Fields: year, month, day, hour, min, sec, microsec */
function parseWallClockResponse(data) {
    const fields = [];
    for (let i = 0; i < CLOCK_FIELDS; i++) {
        fields.push(data.readUInt32LE(i * 4));
    }
    // month is 1-based from PLC, Date constructor expects 0-based
    return new Date(fields[0], fields[1] - 1, fields[2], fields[3], fields[4], fields[5], Math.trunc(fields[6] / 1000));
}
function buildWriteWallClockRequest(date) {
    const data = Buffer.alloc(CLOCK_FIELDS * 4);
    data.writeUInt32LE(date.getFullYear(), 0);
    data.writeUInt32LE(date.getMonth() + 1, 4);
    data.writeUInt32LE(date.getDate(), 8);
    data.writeUInt32LE(date.getHours(), 12);
    data.writeUInt32LE(date.getMinutes(), 16);
    data.writeUInt32LE(date.getSeconds(), 20);
    data.writeUInt32LE(date.getMilliseconds() * 1000, 24);
    return MessageRouter.build(services_1.CIPService.SET_ATTRIBUTE_SINGLE, WALL_CLOCK_PATH, data);
}
//# sourceMappingURL=wall-clock.js.map