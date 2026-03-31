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

/** CIP type code for BOOL */
const BOOL_TYPE = 0xc1;

export class TagRegistry {
  private entries = new Map<string, TagRegistryEntry>();
  private templates = new Map<number, Template>();
  private handleToInstance = new Map<number, number>();

  /** Look up a tag's type info. Returns BOOL for bit-level addresses (e.g. 'status.0'). */
  lookup(tagName: string): TagRegistryEntry | undefined {
    const key = this.normalizeKey(tagName);
    const direct = this.entries.get(key);
    if (direct) return direct;

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
  lookupParent(tagName: string): TagRegistryEntry | undefined {
    const base = this.bitBase(this.normalizeKey(tagName));
    return base ? this.entries.get(base) : undefined;
  }

  /** Register a tag's type info (used by lazy discovery). */
  register(tagName: string, entry: TagRegistryEntry): void {
    this.entries.set(this.normalizeKey(tagName), entry);
  }

  /** User-provided type hint for optimal first-batch performance. */
  define(tagName: string, type: number, size: number, isStruct = false, arrayDims = 0): void {
    this.register(tagName, { type, size, isStruct, arrayDims });
  }

  /** Store a UDT template by instance ID. Also indexes by struct handle for reverse lookup. */
  registerTemplate(instanceId: number, template: Template): void {
    this.templates.set(instanceId, template);
    this.handleToInstance.set(template.attributes.structureHandle, instanceId);
  }

  /** Look up a UDT template by instance ID. */
  lookupTemplate(instanceId: number): Template | undefined {
    return this.templates.get(instanceId);
  }

  /** Look up a UDT template by struct handle (CRC from read response). */
  lookupTemplateByHandle(handle: number): Template | undefined {
    const instanceId = this.handleToInstance.get(handle);
    return instanceId !== undefined ? this.templates.get(instanceId) : undefined;
  }

  /** Check if a tag is known (includes bit-level addresses of known parents). */
  has(tagName: string): boolean {
    const key = this.normalizeKey(tagName);
    if (this.entries.has(key)) return true;
    const base = this.bitBase(key);
    return base ? this.entries.has(base) : false;
  }

  /** Number of registered tags. */
  get size(): number {
    return this.entries.size;
  }

  /** Clear all entries (but not templates — those are reusable). */
  clearTags(): void {
    this.entries.clear();
  }

  /** Clear everything including templates. */
  clearAll(): void {
    this.entries.clear();
    this.templates.clear();
    this.handleToInstance.clear();
  }

  /** Normalize tag name for case-insensitive lookup. */
  private normalizeKey(tagName: string): string {
    return tagName.toLowerCase();
  }

  /** If key is a bit address (e.g. 'status.0'), return the base name. Otherwise undefined. */
  private bitBase(key: string): string | undefined {
    const dot = key.lastIndexOf('.');
    if (dot === -1) return undefined;
    const suffix = key.substring(dot + 1);
    return /^\d{1,2}$/.test(suffix) ? key.substring(0, dot) : undefined;
  }
}
