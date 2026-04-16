"use strict";
/**
 * Controller properties — Get Attribute All on Identity Object.
 * Per CIP Vol 1, Chapter 5 — Identity Object (Class 0x01, Instance 0x01)
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
exports.buildGetControllerPropsRequest = buildGetControllerPropsRequest;
exports.parseControllerProps = parseControllerProps;
const MessageRouter = __importStar(require("../cip/message-router"));
const services_1 = require("../cip/services");
const epath_1 = require("../cip/epath");
/** Identity Object: Class 0x01, Instance 0x01 */
const IDENTITY_PATH = new epath_1.EPathBuilder()
    .logical(epath_1.LogicalType.ClassID, 0x01)
    .logical(epath_1.LogicalType.InstanceID, 0x01)
    .build();
/** Build a Get Attribute All request for the Identity Object. */
function buildGetControllerPropsRequest() {
    return MessageRouter.build(services_1.CIPService.GET_ATTRIBUTE_ALL, IDENTITY_PATH, Buffer.alloc(0));
}
/**
 * Parse Identity Object response.
 * Layout: vendor(2), deviceType(2), productCode(2), major(1), minor(1),
 *         status(2), serialNumber(4), nameLength(1), name(N)
 */
function parseControllerProps(data) {
    let ptr = 0;
    ptr += 2; // vendor ID
    ptr += 2; // device type
    ptr += 2; // product code
    const major = data.readUInt8(ptr);
    ptr += 1;
    const minor = data.readUInt8(ptr);
    ptr += 1;
    const version = `${major}.${minor}`;
    const status = data.readUInt16LE(ptr);
    ptr += 2;
    const serialNumber = data.readUInt32LE(ptr);
    ptr += 4;
    const nameLen = data.readUInt8(ptr);
    ptr += 1;
    const name = data.subarray(ptr, ptr + nameLen).toString('utf8');
    // Parse status flags
    const statusMasked = status & 0x0ff0;
    const faulted = (statusMasked & 0x0f00) !== 0;
    const run = (status & 0x00f0) === 0x0060;
    const program = (status & 0x00f0) === 0x0070;
    return { name, serialNumber, version, status, faulted, run, program };
}
//# sourceMappingURL=controller-props.js.map