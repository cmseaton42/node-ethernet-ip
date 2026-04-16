"use strict";
/**
 * Write helpers — build write and bit-write requests.
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
exports.buildWriteRequest = buildWriteRequest;
exports.buildBitWriteRequest = buildBitWriteRequest;
const MessageRouter = __importStar(require("../cip/message-router"));
const services_1 = require("../cip/services");
const data_types_1 = require("../cip/data-types");
const tag_path_1 = require("./tag-path");
/** Struct Tag Type Service Parameter marker bytes: A0 02 */
const STRUCT_MARKER_BYTE_0 = 0xa0;
const STRUCT_MARKER_BYTE_1 = 0x02;
/** Rockwell built-in STRING struct handle */
/**
 * Build a CIP Write Tag request.
 *
 * Atomic data layout:  [typeCode(2), count(2), encodedValue(N)]
 * Struct data layout:  [A0 02(2), structHandle(2), count(2), rawValue(N)]
 *
 * @param structHandle - When provided, writes 4-byte struct type param instead of 2-byte atomic
 */
function buildWriteRequest(tagName, value, typeCode, count = 1, structHandle) {
    const path = (0, tag_path_1.buildTagPath)(tagName);
    if (structHandle !== undefined) {
        const raw = structHandle === data_types_1.STRING_STRUCT_HANDLE && typeof value === 'string'
            ? (0, data_types_1.getCodec)(data_types_1.CIPDataType.STRING).encode(value)
            : value;
        const HEADER_SIZE = 6; // A0 02(2) + handle(2) + count(2)
        const data = Buffer.alloc(HEADER_SIZE + raw.length);
        data.writeUInt8(STRUCT_MARKER_BYTE_0, 0);
        data.writeUInt8(STRUCT_MARKER_BYTE_1, 1);
        data.writeUInt16LE(structHandle, 2);
        data.writeUInt16LE(count, 4);
        raw.copy(data, HEADER_SIZE);
        return MessageRouter.build(services_1.CIPService.WRITE_TAG, path, data);
    }
    // Atomic
    const codec = (0, data_types_1.getCodec)(typeCode);
    const encoded = codec.encode(value);
    const HEADER_SIZE = 4; // typeCode(2) + count(2)
    const data = Buffer.alloc(HEADER_SIZE + encoded.length);
    data.writeUInt16LE(typeCode, 0);
    data.writeUInt16LE(count, 2);
    encoded.copy(data, HEADER_SIZE);
    return MessageRouter.build(services_1.CIPService.WRITE_TAG, path, data);
}
/**
 * Build a CIP Read Modify Write Tag request for bit-of-word writes.
 * Data layout: [maskSize(2), orMask(N), andMask(N)]
 */
function buildBitWriteRequest(tagName, value, typeCode) {
    const path = (0, tag_path_1.buildTagPath)(tagName);
    const bitIndex = (0, tag_path_1.extractBitIndex)(tagName);
    const byteSize = data_types_1.TYPE_SIZES.get(typeCode) ?? 4;
    const data = Buffer.alloc(2 + byteSize * 2);
    data.writeUInt16LE(byteSize, 0); // Mask size in bytes
    if (byteSize === 1) {
        data.writeUInt8(value ? 1 << bitIndex : 0, 2); // OR mask
        data.writeUInt8(value ? 0xff : 0xff & ~(1 << bitIndex), 3); // AND mask
    }
    else if (byteSize === 2) {
        data.writeUInt16LE(value ? 1 << bitIndex : 0, 2);
        data.writeUInt16LE(value ? 0xffff : 0xffff & ~(1 << bitIndex), 4);
    }
    else {
        data.writeInt32LE(value ? 1 << bitIndex : 0, 2);
        data.writeInt32LE(value ? -1 : -1 & ~(1 << bitIndex), 6);
    }
    return MessageRouter.build(services_1.CIPService.READ_MODIFY_WRITE_TAG, path, data);
}
//# sourceMappingURL=write.js.map