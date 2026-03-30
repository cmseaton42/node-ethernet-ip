/**
 * Tests for struct codec — decode/encode using STRUCT_B from the manual.
 * STRUCT_B: BOOL pilot_on, INT[12] hourlyCount, REAL rate
 * Wire layout (32 bytes): SINT host(1) + pad(3) + INT[12](24) + REAL(4)
 */

import { decodeStruct, encodeStruct } from '@/plc/struct-codec';
import { Template, TemplateMember } from '@/registry/tag-registry';
import { CIPDataType } from '@/cip/data-types';

function makeStructB(): Template {
  const members: TemplateMember[] = [
    {
      name: 'ZZZZZZZZZZSTRUCT_B0',
      info: 0,
      type: { code: CIPDataType.SINT, isStruct: false, isReserved: false, arrayDims: 0 },
      offset: 0,
    },
    {
      name: 'pilot_on',
      info: 0,
      type: { code: CIPDataType.BOOL, isStruct: false, isReserved: false, arrayDims: 0 },
      offset: 0,
    },
    {
      name: 'hourlyCount',
      info: 12,
      type: { code: CIPDataType.INT, isStruct: false, isReserved: false, arrayDims: 0 },
      offset: 4,
    },
    {
      name: 'rate',
      info: 0,
      type: { code: CIPDataType.REAL, isStruct: false, isReserved: false, arrayDims: 0 },
      offset: 0x1c,
    },
  ];
  return {
    name: 'STRUCT_B',
    attributes: {
      id: 0x02e9,
      objectDefinitionSize: 0x1e,
      structureSize: 0x20,
      memberCount: 4,
      structureHandle: 0x9ecd,
    },
    members,
  };
}

/** Build the wire data from the manual example (p52-53). */
function buildStructBData(): Buffer {
  const buf = Buffer.alloc(0x20); // 32 bytes
  buf.writeUInt8(0x01, 0); // host SINT = 1 (pilot_on = bit 0 set)
  // pad bytes 1-3 = 0
  for (let i = 0; i < 12; i++) {
    buf.writeInt16LE(i, 4 + i * 2); // hourlyCount[i] = i
  }
  buf.writeFloatLE(1.0, 0x1c); // rate = 1.0
  return buf;
}

const noLookup = () => undefined;

describe('decodeStruct', () => {
  it('decodes STRUCT_B from the manual example', () => {
    const result = decodeStruct(makeStructB(), buildStructBData(), noLookup);

    expect(result.pilot_on).toBe(true);
    expect(result.hourlyCount).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(result.rate).toBeCloseTo(1.0);
  });

  it('skips hidden BOOL host members', () => {
    const result = decodeStruct(makeStructB(), buildStructBData(), noLookup);
    expect(result).not.toHaveProperty('ZZZZZZZZZZSTRUCT_B0');
  });

  it('decodes pilot_on=false when bit 0 is clear', () => {
    const data = buildStructBData();
    data.writeUInt8(0x00, 0); // clear host SINT
    const result = decodeStruct(makeStructB(), data, noLookup);
    expect(result.pilot_on).toBe(false);
  });

  it('decodes BOOL at non-zero bit position', () => {
    const template = makeStructB();
    template.members[1].info = 3; // pilot_on at bit 3
    const data = buildStructBData();
    data.writeUInt8(0x08, 0); // bit 3 set
    const result = decodeStruct(template, data, noLookup);
    expect(result.pilot_on).toBe(true);
  });
});

describe('encodeStruct', () => {
  it('encodes STRUCT_B matching the manual wire format', () => {
    const values = {
      pilot_on: true,
      hourlyCount: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      rate: 1.0,
    };
    const buf = encodeStruct(makeStructB(), values, noLookup);

    expect(buf.length).toBe(0x20);
    expect(buf.readUInt8(0) & 0x01).toBe(1); // pilot_on bit
    for (let i = 0; i < 12; i++) {
      expect(buf.readInt16LE(4 + i * 2)).toBe(i);
    }
    expect(buf.readFloatLE(0x1c)).toBeCloseTo(1.0);
  });

  it('clears BOOL bit when false', () => {
    const buf = encodeStruct(makeStructB(), { pilot_on: false }, noLookup);
    expect(buf.readUInt8(0) & 0x01).toBe(0);
  });

  it('skips undefined members', () => {
    // Only set rate — other fields should be zero
    const buf = encodeStruct(makeStructB(), { rate: 2.5 }, noLookup);
    expect(buf.readFloatLE(0x1c)).toBeCloseTo(2.5);
    expect(buf.readUInt8(0)).toBe(0); // host SINT untouched
  });
});

describe('round-trip', () => {
  it('encode then decode produces original values', () => {
    const original = {
      pilot_on: true,
      hourlyCount: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
      rate: 3.14,
    };
    const template = makeStructB();
    const buf = encodeStruct(template, original, noLookup);
    const decoded = decodeStruct(template, buf, noLookup);

    expect(decoded.pilot_on).toBe(true);
    expect(decoded.hourlyCount).toEqual(original.hourlyCount);
    expect(decoded.rate as number).toBeCloseTo(3.14, 2);
  });
});

describe('nested struct decode/encode', () => {
  const innerTemplate: Template = {
    name: 'Inner',
    attributes: {
      id: 0x50,
      objectDefinitionSize: 2,
      structureSize: 8,
      memberCount: 2,
      structureHandle: 0xaaaa,
    },
    members: [
      {
        name: 'x',
        info: 0,
        type: { code: CIPDataType.DINT, isStruct: false, isReserved: false, arrayDims: 0 },
        offset: 0,
      },
      {
        name: 'y',
        info: 0,
        type: { code: CIPDataType.DINT, isStruct: false, isReserved: false, arrayDims: 0 },
        offset: 4,
      },
    ],
  };

  const outerTemplate: Template = {
    name: 'Outer',
    attributes: {
      id: 0x60,
      objectDefinitionSize: 4,
      structureSize: 12,
      memberCount: 2,
      structureHandle: 0xbbbb,
    },
    members: [
      {
        name: 'val',
        info: 0,
        type: { code: CIPDataType.DINT, isStruct: false, isReserved: false, arrayDims: 0 },
        offset: 0,
      },
      {
        name: 'nested',
        info: 0,
        type: { code: 0x50, isStruct: true, isReserved: false, arrayDims: 0 },
        offset: 4,
      },
    ],
  };

  const lookup = (code: number) => (code === 0x50 ? innerTemplate : undefined);

  it('decodes nested struct', () => {
    const data = Buffer.alloc(12);
    data.writeInt32LE(99, 0);
    data.writeInt32LE(10, 4);
    data.writeInt32LE(20, 8);

    const result = decodeStruct(outerTemplate, data, lookup);
    expect(result.val).toBe(99);
    expect(result.nested).toEqual({ x: 10, y: 20 });
  });

  it('encodes nested struct', () => {
    const values = { val: 99, nested: { x: 10, y: 20 } };
    const buf = encodeStruct(outerTemplate, values, lookup);
    expect(buf.readInt32LE(0)).toBe(99);
    expect(buf.readInt32LE(4)).toBe(10);
    expect(buf.readInt32LE(8)).toBe(20);
  });

  it('returns raw Buffer when nested template not found', () => {
    const data = Buffer.alloc(12);
    data.writeInt32LE(5, 4);
    const result = decodeStruct(outerTemplate, data, noLookup);
    expect(Buffer.isBuffer(result.nested)).toBe(true);
  });
});

describe('struct with STRING member', () => {
  const tmpl: Template = {
    name: 'WithString',
    attributes: {
      id: 1,
      objectDefinitionSize: 24,
      structureSize: 92,
      memberCount: 2,
      structureHandle: 0xcccc,
    },
    members: [
      {
        name: 'id',
        info: 0,
        type: { code: CIPDataType.DINT, isStruct: false, isReserved: false, arrayDims: 0 },
        offset: 0,
      },
      {
        name: 'label',
        info: 0,
        type: { code: 0x0fce, isStruct: true, isReserved: false, arrayDims: 0 },
        offset: 4,
      },
    ],
  };

  it('decodes STRING member', () => {
    const data = Buffer.alloc(92);
    data.writeInt32LE(42, 0);
    data.writeInt32LE(5, 4); // string length
    data.write('Hello', 8, 'ascii');
    const result = decodeStruct(tmpl, data, noLookup);
    expect(result.id).toBe(42);
    expect(result.label).toBe('Hello');
  });

  it('encodes STRING member', () => {
    const buf = encodeStruct(tmpl, { id: 42, label: 'Hello' }, noLookup);
    expect(buf.readInt32LE(0)).toBe(42);
    expect(buf.readInt32LE(4)).toBe(5);
    expect(buf.toString('ascii', 8, 13)).toBe('Hello');
  });
});

describe('array of structs', () => {
  const elemTemplate: Template = {
    name: 'Elem',
    attributes: {
      id: 0x70,
      objectDefinitionSize: 1,
      structureSize: 4,
      memberCount: 1,
      structureHandle: 0xdddd,
    },
    members: [
      {
        name: 'v',
        info: 0,
        type: { code: CIPDataType.DINT, isStruct: false, isReserved: false, arrayDims: 0 },
        offset: 0,
      },
    ],
  };

  const parentTemplate: Template = {
    name: 'Parent',
    attributes: {
      id: 0x80,
      objectDefinitionSize: 4,
      structureSize: 12,
      memberCount: 1,
      structureHandle: 0xeeee,
    },
    members: [
      {
        name: 'items',
        info: 3,
        type: { code: 0x70, isStruct: true, isReserved: false, arrayDims: 0 },
        offset: 0,
      },
    ],
  };

  const lookup = (code: number) => (code === 0x70 ? elemTemplate : undefined);

  it('decodes array of structs', () => {
    const data = Buffer.alloc(12);
    data.writeInt32LE(1, 0);
    data.writeInt32LE(2, 4);
    data.writeInt32LE(3, 8);
    const result = decodeStruct(parentTemplate, data, lookup);
    expect(result.items).toEqual([{ v: 1 }, { v: 2 }, { v: 3 }]);
  });

  it('encodes array of structs', () => {
    const values = { items: [{ v: 10 }, { v: 20 }, { v: 30 }] };
    const buf = encodeStruct(parentTemplate, values, lookup);
    expect(buf.readInt32LE(0)).toBe(10);
    expect(buf.readInt32LE(4)).toBe(20);
    expect(buf.readInt32LE(8)).toBe(30);
  });
});
