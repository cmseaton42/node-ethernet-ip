"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagRegistry = void 0;
/** CIP type code for BOOL */
const BOOL_TYPE = 0xc1;
class TagRegistry {
    constructor() {
        this.entries = new Map();
        this.templates = new Map();
        this.handleToInstance = new Map();
    }
    /** Strip array indices: 'foo[1,2]' → 'foo', 'foo[0].bar' → 'foo.bar' */
    arrayBase(key) {
        const idx = key.indexOf('[');
        if (idx === -1)
            return undefined;
        const close = key.indexOf(']', idx);
        if (close === -1)
            return undefined;
        return key.substring(0, idx) + key.substring(close + 1);
    }
    /** Look up a tag's type info. Returns BOOL for bit-level addresses (e.g. 'status.0'). */
    lookup(tagName) {
        const key = this.normalizeKey(tagName);
        const direct = this.entries.get(key);
        if (direct)
            return direct;
        // Array element → base tag
        const arrBase = this.arrayBase(key);
        if (arrBase) {
            const parent = this.entries.get(arrBase);
            if (parent)
                return parent;
        }
        // Bit address → BOOL
        const base = this.bitBase(key);
        if (base) {
            const parent = this.entries.get(base);
            if (parent && !parent.isStruct) {
                return { type: BOOL_TYPE, size: 1, isStruct: false, arrayDims: 0 };
            }
        }
        return undefined;
    }
    /** Look up the parent integer entry for a bit-level address (for mask sizing). */
    lookupParent(tagName) {
        const base = this.bitBase(this.normalizeKey(tagName));
        return base ? this.entries.get(base) : undefined;
    }
    /** Register a tag's type info (used by lazy discovery). */
    register(tagName, entry) {
        this.entries.set(this.normalizeKey(tagName), entry);
    }
    /** User-provided type hint for optimal first-batch performance. */
    define(tagName, type, size, isStruct = false, arrayDims = 0) {
        this.register(tagName, { type, size, isStruct, arrayDims });
    }
    /** Store a UDT template by instance ID. Also indexes by struct handle for reverse lookup. */
    registerTemplate(instanceId, template) {
        this.templates.set(instanceId, template);
        this.handleToInstance.set(template.attributes.structureHandle, instanceId);
    }
    /** Look up a UDT template by instance ID. */
    lookupTemplate(instanceId) {
        return this.templates.get(instanceId);
    }
    /** Look up a UDT template by struct handle (CRC from read response). */
    lookupTemplateByHandle(handle) {
        const instanceId = this.handleToInstance.get(handle);
        return instanceId !== undefined ? this.templates.get(instanceId) : undefined;
    }
    /** Check if a tag is known (includes bit-level addresses of known parents). */
    has(tagName) {
        const key = this.normalizeKey(tagName);
        if (this.entries.has(key))
            return true;
        const arrBase = this.arrayBase(key);
        if (arrBase && this.entries.has(arrBase))
            return true;
        const base = this.bitBase(key);
        return base ? this.entries.has(base) : false;
    }
    /** Number of registered tags. */
    get size() {
        return this.entries.size;
    }
    /** Clear all entries (but not templates — those are reusable). */
    clearTags() {
        this.entries.clear();
    }
    /** Clear everything including templates. */
    clearAll() {
        this.entries.clear();
        this.templates.clear();
        this.handleToInstance.clear();
    }
    /** Normalize tag name for case-insensitive lookup. */
    normalizeKey(tagName) {
        return tagName.toLowerCase();
    }
    /** If key is a bit address (e.g. 'status.0'), return the base name. Otherwise undefined. */
    bitBase(key) {
        const dot = key.lastIndexOf('.');
        if (dot === -1)
            return undefined;
        const suffix = key.substring(dot + 1);
        return /^\d{1,2}$/.test(suffix) ? key.substring(0, dot) : undefined;
    }
}
exports.TagRegistry = TagRegistry;
//# sourceMappingURL=tag-registry.js.map