"use strict";
/**
 * Struct helpers — extracted from PLC class for readability.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateLookup = templateLookup;
exports.buildShape = buildShape;
exports.encodeIfStruct = encodeIfStruct;
exports.decodeIfStruct = decodeIfStruct;
const data_types_1 = require("../cip/data-types");
const template_1 = require("../cip/template");
const struct_codec_1 = require("./struct-codec");
/** Create a template lookup function from a registry. */
function templateLookup(registry) {
    return (code) => registry.lookupTemplateByHandle(code) ?? registry.lookupTemplate(code);
}
/** Build a recursive shape description for a struct template. */
function buildShape(tmpl, registry) {
    const lookup = templateLookup(registry);
    const members = {};
    for (const m of tmpl.members) {
        if ((0, template_1.isBoolHost)(m))
            continue;
        const shape = {
            type: m.type.isStruct
                ? m.type.code === data_types_1.STRING_STRUCT_HANDLE
                    ? 'STRING'
                    : (lookup(m.type.code)?.name ?? `0x${m.type.code.toString(16)}`)
                : (0, data_types_1.getTypeName)(m.type.code),
        };
        if (m.info > 0 && m.type.code !== data_types_1.CIPDataType.BOOL)
            shape.array = m.info;
        if (m.type.isStruct && m.type.code !== data_types_1.STRING_STRUCT_HANDLE) {
            const nested = lookup(m.type.code);
            if (nested)
                shape.members = buildShape(nested, registry).members;
        }
        members[m.name] = shape;
    }
    return { name: tmpl.name, members };
}
/** Encode a struct value to Buffer if template is available, otherwise return as-is. */
function encodeIfStruct(value, entry, registry) {
    if (entry.isStruct &&
        typeof value === 'object' &&
        !Buffer.isBuffer(value) &&
        !Array.isArray(value)) {
        const lookup = templateLookup(registry);
        const tmpl = lookup(entry.type);
        if (tmpl)
            return (0, struct_codec_1.encodeStruct)(tmpl, value, lookup);
    }
    return value;
}
/** Decode a struct Buffer to a JS object if template is available, otherwise return as-is. */
function decodeIfStruct(value, template, registry) {
    if (template && Buffer.isBuffer(value)) {
        return (0, struct_codec_1.decodeStruct)(template, value, templateLookup(registry));
    }
    return value;
}
//# sourceMappingURL=struct-helpers.js.map