/**
 * Tests for CIP Template build/parse functions.
 * Uses the STRUCT_B example from the Rockwell Data Access manual:
 *   BOOL pilot_on, INT[12] hourlyCount, REAL rate
 *
 * Template instance 0x02E9, structure handle 0x9ECD.
 */

import {
  buildGetAttributesRequest,
  parseGetAttributesResponse,
  buildReadTemplateRequest,
  parseReadTemplateResponse,
  calcReadByteCount,
  isBoolHost,
} from '@/cip/template';
import { CIPService } from '@/cip/services';
import { CIPDataType } from '@/cip/data-types';

/** Build the Get_Attribute_List response from the manual example (p47). */
function buildManualGetAttributesReply(): Buffer {
  // count(2) + 4 × [attrId(2) + status(2) + value(N)]
  const buf = Buffer.alloc(2 + (4 + 4) + (4 + 4) + (4 + 2) + (4 + 2));
  let pos = 0;

  buf.writeUInt16LE(4, pos);
  pos += 2; // count

  // Attr 4: objectDefinitionSize = 0x1E (30 words)
  buf.writeUInt16LE(4, pos);
  buf.writeUInt16LE(0, pos + 2);
  buf.writeUInt32LE(0x1e, pos + 4);
  pos += 8;

  // Attr 5: structureSize = 0x20 (32 bytes)
  buf.writeUInt16LE(5, pos);
  buf.writeUInt16LE(0, pos + 2);
  buf.writeUInt32LE(0x20, pos + 4);
  pos += 8;

  // Attr 2: memberCount = 4
  buf.writeUInt16LE(2, pos);
  buf.writeUInt16LE(0, pos + 2);
  buf.writeUInt16LE(4, pos + 4);
  pos += 6;

  // Attr 1: structureHandle = 0x9ECD
  buf.writeUInt16LE(1, pos);
  buf.writeUInt16LE(0, pos + 2);
  buf.writeUInt16LE(0x9ecd, pos + 4);

  return buf;
}

/**
 * Build the Read Template response from the manual example (p50-51).
 * 4 members × 8 bytes + template name + 4 member names.
 */
function buildManualReadTemplateReply(): Buffer {
  // Member definitions (8 bytes each)
  const members = Buffer.alloc(32);

  // Member 1: SINT host for BOOL — info=0, type=0x00C2 (SINT), offset=0
  members.writeUInt16LE(0x0000, 0);
  members.writeUInt16LE(0x00c2, 2);
  members.writeUInt32LE(0x00000000, 4);

  // Member 2: BOOL pilot_on — info=0 (bit 0), type=0x00C1 (BOOL), offset=0
  members.writeUInt16LE(0x0000, 8);
  members.writeUInt16LE(0x00c1, 10);
  members.writeUInt32LE(0x00000000, 12);

  // Member 3: INT[12] hourlyCount — info=12, type=0x20C3 (INT, array flag), offset=4
  members.writeUInt16LE(0x000c, 16);
  members.writeUInt16LE(0x00c3, 18); // type without array flag in bits 13-14 per actual wire
  members.writeUInt32LE(0x00000004, 20);

  // Member 4: REAL rate — info=0, type=0x00CA (REAL), offset=0x1C
  members.writeUInt16LE(0x0000, 24);
  members.writeUInt16LE(0x00ca, 26);
  members.writeUInt32LE(0x0000001c, 28);

  // Null-terminated strings
  const strings = Buffer.from(
    'STRUCT_B;nEBECEAHA\0' +
      'ZZZZZZZZZZ' +
      'STRUCT_B0\0' +
      'pilot_on\0' +
      'hourlyCount\0' +
      'rate\0',
  );

  return Buffer.concat([members, strings]);
}

describe('buildGetAttributesRequest', () => {
  it('uses Get_Attributes service (0x03)', () => {
    const buf = buildGetAttributesRequest(0x02e9);
    expect(buf[0]).toBe(CIPService.GET_ATTRIBUTES);
  });

  it('targets class 0x6C', () => {
    const buf = buildGetAttributesRequest(0x02e9);
    // Path: 20 6C 25 00 E9 02
    expect(buf[2]).toBe(0x20);
    expect(buf[3]).toBe(0x6c);
  });

  it('requests 4 attributes', () => {
    const buf = buildGetAttributesRequest(0x02e9);
    const pathWords = buf[1];
    const dataStart = 2 + pathWords * 2;
    expect(buf.readUInt16LE(dataStart)).toBe(4); // count
  });
});

describe('parseGetAttributesResponse', () => {
  it('parses the manual STRUCT_B example', () => {
    const data = buildManualGetAttributesReply();
    const attrs = parseGetAttributesResponse(data);
    expect(attrs.objectDefinitionSize).toBe(0x1e);
    expect(attrs.structureSize).toBe(0x20);
    expect(attrs.memberCount).toBe(4);
    expect(attrs.structureHandle).toBe(0x9ecd);
  });
});

describe('calcReadByteCount', () => {
  it('computes (size * 4) - 23', () => {
    expect(calcReadByteCount(0x1e)).toBe(0x1e * 4 - 23);
  });
});

describe('buildReadTemplateRequest', () => {
  it('uses Read Tag service (0x4C)', () => {
    const buf = buildReadTemplateRequest(0x02e9, 0, 97);
    expect(buf[0]).toBe(CIPService.READ_TAG);
  });

  it('includes offset and byte count in data', () => {
    const buf = buildReadTemplateRequest(0x02e9, 0, 97);
    const pathWords = buf[1];
    const dataStart = 2 + pathWords * 2;
    expect(buf.readUInt32LE(dataStart)).toBe(0); // offset
    expect(buf.readUInt16LE(dataStart + 4)).toBe(97); // byte count
  });
});

describe('parseReadTemplateResponse', () => {
  it('parses the manual STRUCT_B example', () => {
    const data = buildManualReadTemplateReply();
    const { members, name } = parseReadTemplateResponse(data, 4);

    expect(name).toBe('STRUCT_B');
    expect(members).toHaveLength(4);

    // Member 1: hidden SINT host
    expect(members[0].name).toMatch(/^ZZZZZZZZZZ/);
    expect(members[0].type.code).toBe(CIPDataType.SINT);
    expect(members[0].offset).toBe(0);

    // Member 2: BOOL pilot_on
    expect(members[1].name).toBe('pilot_on');
    expect(members[1].type.code).toBe(CIPDataType.BOOL);
    expect(members[1].info).toBe(0); // bit 0

    // Member 3: INT[12] hourlyCount
    expect(members[2].name).toBe('hourlyCount');
    expect(members[2].type.code).toBe(CIPDataType.INT);
    expect(members[2].info).toBe(12); // array size

    // Member 4: REAL rate
    expect(members[3].name).toBe('rate');
    expect(members[3].type.code).toBe(CIPDataType.REAL);
    expect(members[3].offset).toBe(0x1c);
  });

  it('strips ;n suffix from template name', () => {
    const data = buildManualReadTemplateReply();
    const { name } = parseReadTemplateResponse(data, 4);
    expect(name).toBe('STRUCT_B');
    expect(name).not.toContain(';');
  });
});


describe('parseReadTemplateResponse edge cases', () => {
  it('handles missing null terminator in last string', () => {
    // 1 member + template name without null + member name without null
    const members = Buffer.alloc(8);
    members.writeUInt16LE(0, 0);
    members.writeUInt16LE(CIPDataType.DINT, 2);
    members.writeUInt32LE(0, 4);
    const strings = Buffer.from('MyUDT\0field1'); // no trailing null
    const data = Buffer.concat([members, strings]);

    const { members: parsed, name } = parseReadTemplateResponse(data, 1);
    expect(name).toBe('MyUDT');
    expect(parsed[0].name).toBe('field1');
  });
});

describe('isBoolHost', () => {
  it('detects ZZZZZZZZZZ prefix', () => {
    expect(
      isBoolHost({
        name: 'ZZZZZZZZZZSTRUCT_B0',
        info: 0,
        type: { code: 0xc2, isStruct: false, isReserved: false, arrayDims: 0 },
        offset: 0,
      }),
    ).toBe(true);
  });

  it('detects __ prefix', () => {
    expect(
      isBoolHost({
        name: '__hidden',
        info: 0,
        type: { code: 0xc2, isStruct: false, isReserved: false, arrayDims: 0 },
        offset: 0,
      }),
    ).toBe(true);
  });

  it('returns false for normal members', () => {
    expect(
      isBoolHost({
        name: 'rate',
        info: 0,
        type: { code: 0xca, isStruct: false, isReserved: false, arrayDims: 0 },
        offset: 0,
      }),
    ).toBe(false);
  });
});
