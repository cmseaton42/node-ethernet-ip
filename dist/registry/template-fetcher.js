"use strict";
/**
 * Template Fetcher — fetch and cache UDT templates from the PLC.
 *
 * Flow:
 *   1. Get_Attribute_List → objectDefinitionSize, structureSize, memberCount, handle
 *   2. Read Template → member definitions + names
 *   3. Cache in TagRegistry
 *   4. Recursively fetch nested struct templates
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
exports.fetchTemplate = fetchTemplate;
const MessageRouter = __importStar(require("../cip/message-router"));
const template_1 = require("../cip/template");
const errors_1 = require("../errors");
/** CIP status: more data available (fragmented response) */
const STATUS_FRAGMENTED = 0x06;
/**
 * Fetch a template by instance ID, caching it in the registry.
 * Recursively fetches nested struct templates.
 *
 * @param sendCIP  - Function to send a CIP request and get the MR response data
 * @param registry - TagRegistry to cache templates in
 * @param instanceId - Template instance ID (symbolType & 0x0FFF)
 */
async function fetchTemplate(sendCIP, registry, instanceId) {
    // Check cache first
    const cached = registry.lookupTemplate(instanceId);
    if (cached)
        return cached;
    // Step 1: Get attributes
    const attrResp = await sendCIP((0, template_1.buildGetAttributesRequest)(instanceId));
    const attrMR = MessageRouter.parse(attrResp);
    if (attrMR.generalStatusCode !== 0) {
        throw new errors_1.CIPError(attrMR.generalStatusCode, attrMR.extendedStatus);
    }
    const attrs = (0, template_1.parseGetAttributesResponse)(attrMR.data);
    attrs.id = instanceId;
    // Step 2: Read template (handle fragmentation)
    const totalBytes = (0, template_1.calcReadByteCount)(attrs.objectDefinitionSize);
    let templateData = Buffer.alloc(0);
    let offset = 0;
    while (offset < totalBytes) {
        const remaining = totalBytes - offset;
        const req = (0, template_1.buildReadTemplateRequest)(instanceId, offset, remaining);
        const resp = await sendCIP(req);
        const mr = MessageRouter.parse(resp);
        if (mr.generalStatusCode !== 0 && mr.generalStatusCode !== STATUS_FRAGMENTED) {
            throw new errors_1.CIPError(mr.generalStatusCode, mr.extendedStatus);
        }
        templateData = Buffer.concat([templateData, mr.data]);
        offset = templateData.length;
        if (mr.generalStatusCode === 0)
            break;
    }
    // Step 3: Parse members and names
    const { members, name } = (0, template_1.parseReadTemplateResponse)(templateData, attrs.memberCount);
    const template = { name, attributes: attrs, members };
    // Cache before recursing (prevents infinite loops on circular refs)
    registry.registerTemplate(instanceId, template);
    // Step 4: Recursively fetch nested struct templates
    for (const member of members) {
        if (member.type.isStruct && !registry.lookupTemplate(member.type.code)) {
            await fetchTemplate(sendCIP, registry, member.type.code);
        }
    }
    return template;
}
//# sourceMappingURL=template-fetcher.js.map