/**
 * Struct helpers — extracted from PLC class for readability.
 */
import { TagRegistry, Template } from '../registry/tag-registry';
import { TagValue } from './types';
export interface MemberShape {
    type: string;
    array?: number;
    members?: Record<string, MemberShape>;
}
export interface StructShape {
    name: string;
    members: Record<string, MemberShape>;
}
/** Create a template lookup function from a registry. */
export declare function templateLookup(registry: TagRegistry): (code: number) => Template | undefined;
/** Build a recursive shape description for a struct template. */
export declare function buildShape(tmpl: Template, registry: TagRegistry): StructShape;
/** Encode a struct value to Buffer if template is available, otherwise return as-is. */
export declare function encodeIfStruct(value: TagValue, entry: {
    type: number;
    isStruct: boolean;
}, registry: TagRegistry): TagValue;
/** Decode a struct Buffer to a JS object if template is available, otherwise return as-is. */
export declare function decodeIfStruct(value: TagValue, template: Template | undefined, registry: TagRegistry): TagValue;
//# sourceMappingURL=struct-helpers.d.ts.map