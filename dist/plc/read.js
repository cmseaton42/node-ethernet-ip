"use strict";
/**
 * Read helpers — build read requests and parse responses.
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
exports.buildReadRequest = buildReadRequest;
exports.isStructTypeParam = isStructTypeParam;
exports.parseReadResponse = parseReadResponse;
const MessageRouter = __importStar(require("../cip/message-router"));
const services_1 = require("../cip/services");
const data_types_1 = require("../cip/data-types");
const tag_path_1 = require("./tag-path");
/** Struct Tag Type Service Parameter marker bytes on the wire: A0 02 */
const STRUCT_MARKER_BYTE_0 = 0xa0;
const STRUCT_MARKER_BYTE_1 = 0x02;
/** Atomic type param: 2 bytes (type + 0x00 pad). Struct: 4 bytes (A0 02 + handle). */
const ATOMIC_TYPE_SIZE = 2;
const STRUCT_TYPE_SIZE = 4;
/**
 * Build a CIP Read Tag request.
 */
function buildReadRequest(tagName, count = 1) {
    const path = (0, tag_path_1.buildTagPath)(tagName);
    const data = Buffer.alloc(2);
    data.writeUInt16LE(count, 0); // Element count
    return MessageRouter.build(services_1.CIPService.READ_TAG, path, data);
}
/**
 * Detect struct type marker (wire bytes A0 02).
 */
function isStructTypeParam(data) {
    return data[0] === STRUCT_MARKER_BYTE_0 && data[1] === STRUCT_MARKER_BYTE_1;
}
/** Rockwell built-in STRING struct handle — STRING tags report as struct, not atomic 0xD0.
 *  Custom string UDTs (e.g. STRING20) will have different handles and need template retrieval. */
/**
 * Parse a CIP Read Tag response into a JS value.
 *
 * Atomic response data:  [typeCode(2), value(N)]
 * Struct response data:  [A0 02(2), structHandle(2), value(N)]
 */
function parseReadResponse(data, tagName) {
    if (data.length < ATOMIC_TYPE_SIZE) {
        throw new Error(`Read response too short (${data.length} bytes) for tag "${tagName}"`);
    }
    const isStruct = isStructTypeParam(data);
    const typeCode = isStruct ? data.readUInt16LE(2) : data.readUInt16LE(0);
    const valueData = data.subarray(isStruct ? STRUCT_TYPE_SIZE : ATOMIC_TYPE_SIZE);
    // Bit-of-word: extract single bit (atomics only)
    const bitIndex = (0, tag_path_1.extractBitIndex)(tagName);
    if (bitIndex !== null && !isStruct && (0, data_types_1.isValidType)(typeCode)) {
        const codec = (0, data_types_1.getCodec)(typeCode);
        const raw = codec.decode(valueData, 0);
        return { type: typeCode, isStruct: false, value: !!(raw & (1 << bitIndex)) };
    }
    // STRING special case: built-in STRING struct handle 0x0FCE
    if (isStruct && typeCode === data_types_1.STRING_STRUCT_HANDLE) {
        const codec = (0, data_types_1.getCodec)(data_types_1.CIPDataType.STRING);
        return { type: typeCode, isStruct: true, value: codec.decode(valueData, 0) };
    }
    // Other struct or unknown type — return raw buffer
    if (isStruct || !(0, data_types_1.isValidType)(typeCode)) {
        return { type: typeCode, isStruct, value: Buffer.from(valueData) };
    }
    const codec = (0, data_types_1.getCodec)(typeCode);
    return { type: typeCode, isStruct: false, value: codec.decode(valueData, 0) };
}
//# sourceMappingURL=read.js.map