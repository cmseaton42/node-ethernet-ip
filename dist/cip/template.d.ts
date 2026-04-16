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
import { TemplateAttribute, TemplateMember } from '../registry/tag-registry';
/**
 * Build a Get_Attribute_List request for a Template instance.
 * Requests attributes 4, 5, 2, 1 (per Rockwell example).
 */
export declare function buildGetAttributesRequest(instanceId: number): Buffer;
/**
 * Parse a Get_Attribute_List response.
 *
 * Response layout (after MR header):
 *   count(2), then per attribute: attrId(2) + status(2) + value(N)
 */
export declare function parseGetAttributesResponse(data: Buffer): TemplateAttribute;
/** Calculate byte count for Read Template request. */
export declare function calcReadByteCount(objectDefinitionSize: number): number;
/**
 * Build a Read Template request (service 0x4C to class 0x6C).
 */
export declare function buildReadTemplateRequest(instanceId: number, offset: number, byteCount: number): Buffer;
/**
 * Parse a Read Template response into member definitions and names.
 *
 * Layout:
 *   [member0(8), member1(8), ..., templateName\0, member0Name\0, ...]
 *
 * Template name may have ";n..." suffix — stripped.
 */
export declare function parseReadTemplateResponse(data: Buffer, memberCount: number): {
    members: TemplateMember[];
    name: string;
};
/** Check if a member is a hidden BOOL host (ZZZZZZZZZZ or __ prefix). */
export declare function isBoolHost(member: TemplateMember): boolean;
//# sourceMappingURL=template.d.ts.map