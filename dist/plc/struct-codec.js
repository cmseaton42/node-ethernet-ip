"use strict";
/**
 * Struct Codec — decode/encode struct buffers using Template definitions.
 *
 * Handles:
 *   - Atomic members at their byte offsets
 *   - Arrays (info field = element count)
 *   - BOOLs mapped to hidden SINT hosts (ZZZZZZZZZZ prefix)
 *   - Nested structs (recursive decode via templateLookup)
 *   - Padding bytes between members (implicit from offsets)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeStruct = decodeStruct;
exports.encodeStruct = encodeStruct;
const data_types_1 = require("../cip/data-types");
const template_1 = require("../cip/template");
/**
 * Decode a struct buffer into a JS object using its template.
 *
 * @param template       - The struct's template definition
 * @param data           - Raw struct bytes (structureSize bytes)
 * @param templateLookup - Resolver for nested struct templates
 */
function decodeStruct(template, data, templateLookup) {
    const result = {};
    for (const member of template.members) {
        // Skip hidden BOOL host members — BOOLs are decoded from their host
        if ((0, template_1.isBoolHost)(member))
            continue;
        const { name, type, offset, info } = member;
        if (type.code === data_types_1.CIPDataType.BOOL) {
            // BOOL: read the host SINT at this offset, extract bit from info
            result[name] = (data.readUInt8(offset) & (1 << info)) !== 0;
        }
        else if (type.isStruct) {
            result[name] = decodeStructMember(member, data, templateLookup);
        }
        else if (info > 0) {
            // Array: info = element count
            result[name] = decodeArray(type.code, data, offset, info);
        }
        else if ((0, data_types_1.isValidType)(type.code)) {
            const codec = (0, data_types_1.getCodec)(type.code);
            result[name] = codec.decode(data, offset);
        }
    }
    return result;
}
/**
 * Encode a JS object into a struct buffer using its template.
 *
 * @param template       - The struct's template definition
 * @param values         - JS object with member values
 * @param templateLookup - Resolver for nested struct templates
 */
function encodeStruct(template, values, templateLookup) {
    const buf = Buffer.alloc(template.attributes.structureSize);
    for (const member of template.members) {
        if ((0, template_1.isBoolHost)(member))
            continue;
        const { name, type, offset, info } = member;
        const val = values[name];
        if (val === undefined)
            continue;
        if (type.code === data_types_1.CIPDataType.BOOL) {
            // Set/clear bit in the host SINT
            const current = buf.readUInt8(offset);
            buf.writeUInt8(val ? current | (1 << info) : current & ~(1 << info), offset);
        }
        else if (type.isStruct) {
            encodeStructMember(member, val, buf, templateLookup);
        }
        else if (info > 0) {
            encodeArray(type.code, val, buf, offset);
        }
        else if ((0, data_types_1.isValidType)(type.code)) {
            const codec = (0, data_types_1.getCodec)(type.code);
            codec.encode(val).copy(buf, offset);
        }
    }
    return buf;
}
function decodeStructMember(member, data, templateLookup) {
    // STRING special case
    if (member.type.code === data_types_1.STRING_STRUCT_HANDLE) {
        const codec = (0, data_types_1.getCodec)(data_types_1.CIPDataType.STRING);
        return codec.decode(data, member.offset);
    }
    const nested = templateLookup(member.type.code);
    if (!nested)
        return Buffer.from(data.subarray(member.offset));
    if (member.info > 0) {
        // Array of structs
        const arr = [];
        const elemSize = nested.attributes.structureSize;
        for (let i = 0; i < member.info; i++) {
            arr.push(decodeStruct(nested, data.subarray(member.offset + i * elemSize), templateLookup));
        }
        return arr;
    }
    return decodeStruct(nested, data.subarray(member.offset), templateLookup);
}
function encodeStructMember(member, val, buf, templateLookup) {
    if (member.type.code === data_types_1.STRING_STRUCT_HANDLE) {
        const codec = (0, data_types_1.getCodec)(data_types_1.CIPDataType.STRING);
        codec.encode(val).copy(buf, member.offset);
        return;
    }
    const nested = templateLookup(member.type.code);
    if (!nested)
        return;
    if (member.info > 0 && Array.isArray(val)) {
        const elemSize = nested.attributes.structureSize;
        for (let i = 0; i < val.length; i++) {
            encodeStruct(nested, val[i], templateLookup).copy(buf, member.offset + i * elemSize);
        }
        return;
    }
    encodeStruct(nested, val, templateLookup).copy(buf, member.offset);
}
function decodeArray(typeCode, data, offset, count) {
    if (!(0, data_types_1.isValidType)(typeCode))
        return [];
    const codec = (0, data_types_1.getCodec)(typeCode);
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(codec.decode(data, offset + i * codec.size));
    }
    return result;
}
function encodeArray(typeCode, values, buf, offset) {
    if (!(0, data_types_1.isValidType)(typeCode))
        return;
    const codec = (0, data_types_1.getCodec)(typeCode);
    for (let i = 0; i < values.length; i++) {
        codec.encode(values[i]).copy(buf, offset + i * codec.size);
    }
}
//# sourceMappingURL=struct-codec.js.map