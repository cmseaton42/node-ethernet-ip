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
import { Template } from '../registry/tag-registry';
import { TagRecord } from './types';
/** Rockwell built-in STRING struct handle */
type TemplateLookup = (typeCode: number) => Template | undefined;
/**
 * Decode a struct buffer into a JS object using its template.
 *
 * @param template       - The struct's template definition
 * @param data           - Raw struct bytes (structureSize bytes)
 * @param templateLookup - Resolver for nested struct templates
 */
export declare function decodeStruct(template: Template, data: Buffer, templateLookup: TemplateLookup): TagRecord;
/**
 * Encode a JS object into a struct buffer using its template.
 *
 * @param template       - The struct's template definition
 * @param values         - JS object with member values
 * @param templateLookup - Resolver for nested struct templates
 */
export declare function encodeStruct(template: Template, values: TagRecord, templateLookup: TemplateLookup): Buffer;
export {};
//# sourceMappingURL=struct-codec.d.ts.map