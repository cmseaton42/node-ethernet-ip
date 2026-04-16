/**
 * Tag Registry — caches tag type information.
 *
 * Populated via:
 *   1. Lazy discovery (type parsed from first read response)
 *   2. Full discovery (getTagList)
 *   3. User-provided hints (define)
 *
 * Persists across reconnects — lives outside SessionManager.
 */
export interface TemplateAttribute {
    id: number;
    objectDefinitionSize: number;
    structureSize: number;
    memberCount: number;
    structureHandle: number;
}
export interface TemplateMember {
    name: string;
    info: number;
    type: {
        code: number;
        isStruct: boolean;
        isReserved: boolean;
        arrayDims: number;
    };
    offset: number;
}
export interface Template {
    name: string;
    attributes: TemplateAttribute;
    members: TemplateMember[];
}
export interface TagRegistryEntry {
    type: number;
    size: number;
    isStruct: boolean;
    arrayDims: number;
    dimSizes?: number[];
    template?: Template;
}
export declare class TagRegistry {
    private entries;
    private templates;
    private handleToInstance;
    /** Strip array indices: 'foo[1,2]' → 'foo', 'foo[0].bar' → 'foo.bar' */
    private arrayBase;
    /** Look up a tag's type info. Returns BOOL for bit-level addresses (e.g. 'status.0'). */
    lookup(tagName: string): TagRegistryEntry | undefined;
    /** Look up the parent integer entry for a bit-level address (for mask sizing). */
    lookupParent(tagName: string): TagRegistryEntry | undefined;
    /** Register a tag's type info (used by lazy discovery). */
    register(tagName: string, entry: TagRegistryEntry): void;
    /** User-provided type hint for optimal first-batch performance. */
    define(tagName: string, type: number, size: number, isStruct?: boolean, arrayDims?: number): void;
    /** Store a UDT template by instance ID. Also indexes by struct handle for reverse lookup. */
    registerTemplate(instanceId: number, template: Template): void;
    /** Look up a UDT template by instance ID. */
    lookupTemplate(instanceId: number): Template | undefined;
    /** Look up a UDT template by struct handle (CRC from read response). */
    lookupTemplateByHandle(handle: number): Template | undefined;
    /** Check if a tag is known (includes bit-level addresses of known parents). */
    has(tagName: string): boolean;
    /** Number of registered tags. */
    get size(): number;
    /** Clear all entries (but not templates — those are reusable). */
    clearTags(): void;
    /** Clear everything including templates. */
    clearAll(): void;
    /** Normalize tag name for case-insensitive lookup. */
    private normalizeKey;
    /** If key is a bit address (e.g. 'status.0'), return the base name. Otherwise undefined. */
    private bitBase;
}
//# sourceMappingURL=tag-registry.d.ts.map