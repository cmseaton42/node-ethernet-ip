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
  template?: Template;
}

export class TagRegistry {
  private entries = new Map<string, TagRegistryEntry>();
  private templates = new Map<number, Template>();

  /** Look up a tag's type info. Returns undefined if unknown. */
  lookup(tagName: string): TagRegistryEntry | undefined {
    return this.entries.get(this.normalizeKey(tagName));
  }

  /** Register a tag's type info (used by lazy discovery). */
  register(tagName: string, entry: TagRegistryEntry): void {
    this.entries.set(this.normalizeKey(tagName), entry);
  }

  /** User-provided type hint for optimal first-batch performance. */
  define(tagName: string, type: number, size: number, isStruct = false, arrayDims = 0): void {
    this.register(tagName, { type, size, isStruct, arrayDims });
  }

  /** Store a UDT template by type code. */
  registerTemplate(typeCode: number, template: Template): void {
    this.templates.set(typeCode, template);
  }

  /** Look up a UDT template by type code. */
  lookupTemplate(typeCode: number): Template | undefined {
    return this.templates.get(typeCode);
  }

  /** Check if a tag is known. */
  has(tagName: string): boolean {
    return this.entries.has(this.normalizeKey(tagName));
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
  }

  /** Normalize tag name for case-insensitive lookup. */
  private normalizeKey(tagName: string): string {
    return tagName.toLowerCase();
  }
}
