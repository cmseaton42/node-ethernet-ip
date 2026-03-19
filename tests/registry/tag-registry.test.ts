import { TagRegistry } from '@/registry/tag-registry';
import { parseTagType } from '@/registry/discovery';

describe('TagRegistry', () => {
  let registry: TagRegistry;

  beforeEach(() => {
    registry = new TagRegistry();
  });

  it('starts empty', () => {
    expect(registry.size).toBe(0);
    expect(registry.lookup('MyTag')).toBeUndefined();
    expect(registry.has('MyTag')).toBe(false);
  });

  it('registers and looks up a tag', () => {
    registry.register('MyDINT', { type: 0xc4, size: 4, isStruct: false, arrayDims: 0 });

    expect(registry.has('MyDINT')).toBe(true);
    expect(registry.lookup('MyDINT')).toEqual({
      type: 0xc4,
      size: 4,
      isStruct: false,
      arrayDims: 0,
    });
  });

  it('is case-insensitive', () => {
    registry.register('MyTag', { type: 0xc4, size: 4, isStruct: false, arrayDims: 0 });

    expect(registry.has('mytag')).toBe(true);
    expect(registry.has('MYTAG')).toBe(true);
    expect(registry.lookup('myTag')).toBeDefined();
  });

  it('define() provides user hints', () => {
    registry.define('MyREAL', 0xca, 4);

    expect(registry.lookup('MyREAL')).toEqual({
      type: 0xca,
      size: 4,
      isStruct: false,
      arrayDims: 0,
    });
  });

  it('registers and looks up templates', () => {
    const template = {
      name: 'MyUDT',
      attributes: {
        id: 0x100,
        objectDefinitionSize: 50,
        structureSize: 40,
        memberCount: 3,
        structureHandle: 0xabcd,
      },
      members: [],
    };

    registry.registerTemplate(0x100, template);
    expect(registry.lookupTemplate(0x100)).toBe(template);
    expect(registry.lookupTemplate(0x999)).toBeUndefined();
  });

  it('clearTags preserves templates', () => {
    registry.register('Tag1', { type: 0xc4, size: 4, isStruct: false, arrayDims: 0 });
    registry.registerTemplate(0x100, {
      name: 'UDT',
      attributes: {
        id: 0x100,
        objectDefinitionSize: 0,
        structureSize: 0,
        memberCount: 0,
        structureHandle: 0,
      },
      members: [],
    });

    registry.clearTags();

    expect(registry.size).toBe(0);
    expect(registry.lookupTemplate(0x100)).toBeDefined();
  });

  it('clearAll removes everything', () => {
    registry.register('Tag1', { type: 0xc4, size: 4, isStruct: false, arrayDims: 0 });
    registry.registerTemplate(0x100, {
      name: 'UDT',
      attributes: {
        id: 0x100,
        objectDefinitionSize: 0,
        structureSize: 0,
        memberCount: 0,
        structureHandle: 0,
      },
      members: [],
    });

    registry.clearAll();

    expect(registry.size).toBe(0);
    expect(registry.lookupTemplate(0x100)).toBeUndefined();
  });
});

describe('parseTagType', () => {
  it('parses atomic type', () => {
    // DINT = 0xC4, no flags
    const result = parseTagType(0x00c4);
    expect(result.code).toBe(0xc4);
    expect(result.isStruct).toBe(false);
    expect(result.isReserved).toBe(false);
    expect(result.arrayDims).toBe(0);
  });

  it('parses struct flag', () => {
    // Struct with type code 0x100
    const result = parseTagType(0x8100);
    expect(result.code).toBe(0x100);
    expect(result.isStruct).toBe(true);
  });

  it('parses array dimensions', () => {
    // 1-dim array of DINT: bit 13 set
    const result = parseTagType(0x20c4);
    expect(result.code).toBe(0xc4);
    expect(result.arrayDims).toBe(1);
  });

  it('parses 2-dim array', () => {
    // 2-dim: bits 14-13 = 10
    const result = parseTagType(0x40c4);
    expect(result.arrayDims).toBe(2);
  });

  it('parses reserved flag', () => {
    const result = parseTagType(0x10c4);
    expect(result.isReserved).toBe(true);
    expect(result.code).toBe(0xc4);
  });

  it('parses combined flags', () => {
    // Struct + 1-dim array + type 0x0FF
    const result = parseTagType(0xa0ff);
    expect(result.isStruct).toBe(true);
    expect(result.arrayDims).toBe(1);
    expect(result.code).toBe(0xff);
  });
});

describe('template handle lookup', () => {
  it('lookupTemplateByHandle returns template registered by instance ID', () => {
    const registry = new TagRegistry();
    const tmpl = {
      name: 'Test',
      attributes: { id: 100, objectDefinitionSize: 1, structureSize: 4, memberCount: 0, structureHandle: 0xabcd },
      members: [],
    };
    registry.registerTemplate(100, tmpl);
    expect(registry.lookupTemplateByHandle(0xabcd)).toBe(tmpl);
  });

  it('lookupTemplateByHandle returns undefined for unknown handle', () => {
    const registry = new TagRegistry();
    expect(registry.lookupTemplateByHandle(0x9999)).toBeUndefined();
  });

  it('clearAll clears handle map', () => {
    const registry = new TagRegistry();
    const tmpl = {
      name: 'Test',
      attributes: { id: 1, objectDefinitionSize: 1, structureSize: 4, memberCount: 0, structureHandle: 0x1234 },
      members: [],
    };
    registry.registerTemplate(1, tmpl);
    registry.clearAll();
    expect(registry.lookupTemplateByHandle(0x1234)).toBeUndefined();
    expect(registry.lookupTemplate(1)).toBeUndefined();
  });
});
