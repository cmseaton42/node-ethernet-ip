"use strict";
/**
 * Template Object (Class 0x6C) — build/parse for Get Template Attributes
 * and Read Template requests.
 *
 * Per Rockwell "Logix5000 Data Access" manual, Steps 3-4.
 *
 * Get_Attribute_List (0x03) retrieves:
 *   Attr 4: objectDefinitionSize (UDINT, 32-bit words)
 *   Attr 5: structureSize (UDINT, bytes on wire)
 *   Attr 2: memberCount (UINT)
 *   Attr 1: structureHandle (UINT, CRC)
 *
 * Read Template (0x4C) retrieves per member:
 *   info(2) + type(2) + offset(4) = 8 bytes each
 *   Followed by null-terminated strings: template name, then member names.
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
exports.buildGetAttributesRequest = buildGetAttributesRequest;
exports.parseGetAttributesResponse = parseGetAttributesResponse;
exports.calcReadByteCount = calcReadByteCount;
exports.buildReadTemplateRequest = buildReadTemplateRequest;
exports.parseReadTemplateResponse = parseReadTemplateResponse;
exports.isBoolHost = isBoolHost;
const MessageRouter = __importStar(require("./message-router"));
const services_1 = require("./services");
const logical_1 = require("./epath/segments/logical");
/** Template class ID */
const TEMPLATE_CLASS = 0x6c;
/** Bytes subtracted from (objectDefinitionSize * 4) to get read byte count */
const DEFINITION_OVERHEAD = 23;
/** Each member definition: info(2) + type(2) + offset(4) */
const MEMBER_DEF_SIZE = 8;
/** Build EPATH: Class 0x6C, Instance <id> */
function templatePath(instanceId) {
    return Buffer.concat([
        (0, logical_1.buildLogicalSegment)(logical_1.LogicalType.ClassID, TEMPLATE_CLASS),
        (0, logical_1.buildLogicalSegment)(logical_1.LogicalType.InstanceID, instanceId),
    ]);
}
/**
 * Build a Get_Attribute_List request for a Template instance.
 * Requests attributes 4, 5, 2, 1 (per Rockwell example).
 */
function buildGetAttributesRequest(instanceId) {
    const data = Buffer.alloc(10); // count(2) + 4 × attrId(2)
    data.writeUInt16LE(4, 0);
    data.writeUInt16LE(4, 2); // objectDefinitionSize
    data.writeUInt16LE(5, 4); // structureSize
    data.writeUInt16LE(2, 6); // memberCount
    data.writeUInt16LE(1, 8); // structureHandle
    return MessageRouter.build(services_1.CIPService.GET_ATTRIBUTES, templatePath(instanceId), data);
}
/**
 * Parse a Get_Attribute_List response.
 *
 * Response layout (after MR header):
 *   count(2), then per attribute: attrId(2) + status(2) + value(N)
 */
function parseGetAttributesResponse(data) {
    let pos = 2; // skip count
    // Attr 4: objectDefinitionSize (UDINT)
    pos += 4; // attrId + status
    const objectDefinitionSize = data.readUInt32LE(pos);
    pos += 4;
    // Attr 5: structureSize (UDINT)
    pos += 4;
    const structureSize = data.readUInt32LE(pos);
    pos += 4;
    // Attr 2: memberCount (UINT)
    pos += 4;
    const memberCount = data.readUInt16LE(pos);
    pos += 2;
    // Attr 1: structureHandle (UINT)
    pos += 4;
    const structureHandle = data.readUInt16LE(pos);
    return { id: 0, objectDefinitionSize, structureSize, memberCount, structureHandle };
}
/** Calculate byte count for Read Template request. */
function calcReadByteCount(objectDefinitionSize) {
    return objectDefinitionSize * 4 - DEFINITION_OVERHEAD;
}
/**
 * Build a Read Template request (service 0x4C to class 0x6C).
 */
function buildReadTemplateRequest(instanceId, offset, byteCount) {
    const data = Buffer.alloc(6);
    data.writeUInt32LE(offset, 0);
    data.writeUInt16LE(byteCount, 4);
    return MessageRouter.build(services_1.CIPService.READ_TAG, templatePath(instanceId), data);
}
/**
 * Parse a Read Template response into member definitions and names.
 *
 * Layout:
 *   [member0(8), member1(8), ..., templateName\0, member0Name\0, ...]
 *
 * Template name may have ";n..." suffix — stripped.
 */
function parseReadTemplateResponse(data, memberCount) {
    const members = [];
    for (let i = 0; i < memberCount; i++) {
        const base = i * MEMBER_DEF_SIZE;
        const info = data.readUInt16LE(base);
        const rawType = data.readUInt16LE(base + 2);
        const offset = data.readUInt32LE(base + 4);
        members.push({
            name: '',
            info,
            type: {
                code: rawType & 0x0fff,
                isStruct: (rawType & 0x8000) !== 0,
                isReserved: false,
                arrayDims: (rawType >> 13) & 0x03,
            },
            offset,
        });
    }
    // Null-terminated strings after member defs
    const strStart = memberCount * MEMBER_DEF_SIZE;
    const strings = parseNullStrings(data.subarray(strStart), memberCount + 1);
    // Template name: strip ";..." suffix
    const raw = strings[0] ?? '';
    const name = raw.includes(';') ? raw.substring(0, raw.indexOf(';')) : raw;
    for (let i = 0; i < memberCount; i++) {
        members[i].name = strings[i + 1] ?? '';
    }
    return { members, name };
}
/** Extract up to `count` null-terminated strings from a buffer. */
function parseNullStrings(buf, count) {
    const result = [];
    let pos = 0;
    for (let i = 0; i < count && pos < buf.length; i++) {
        const end = buf.indexOf(0x00, pos);
        if (end === -1) {
            result.push(buf.toString('ascii', pos));
            break;
        }
        result.push(buf.toString('ascii', pos, end));
        pos = end + 1;
    }
    return result;
}
/** Check if a member is a hidden BOOL host (ZZZZZZZZZZ or __ prefix). */
function isBoolHost(member) {
    return member.name.startsWith('ZZZZZZZZZZ') || member.name.startsWith('__');
}
//# sourceMappingURL=template.js.map