/**
 * Tests for template-fetcher — mock CIP responses to verify fetch flow.
 */

import { fetchTemplate } from '@/registry/template-fetcher';
import { TagRegistry } from '@/registry/tag-registry';
import { CIPService } from '@/cip/services';
import { REPLY_FLAG } from '@/cip/services';
import { CIPDataType } from '@/cip/data-types';

/** Wrap CIP data in a successful MR response. */
function wrapMR(service: number, data: Buffer, status = 0): Buffer {
  const buf = Buffer.alloc(4 + data.length);
  buf.writeUInt8(service | REPLY_FLAG, 0);
  buf.writeUInt8(0, 1); // reserved
  buf.writeUInt8(status, 2);
  buf.writeUInt8(0, 3); // ext status len
  data.copy(buf, 4);
  return buf;
}

/** Build a Get_Attribute_List response for a simple 2-member struct. */
function buildAttrResponse(
  objDefSize: number,
  structSize: number,
  memberCount: number,
  handle: number,
): Buffer {
  const data = Buffer.alloc(2 + 8 + 8 + 6 + 6);
  let pos = 0;
  data.writeUInt16LE(4, pos);
  pos += 2;
  // attr 4
  data.writeUInt16LE(4, pos);
  data.writeUInt16LE(0, pos + 2);
  data.writeUInt32LE(objDefSize, pos + 4);
  pos += 8;
  // attr 5
  data.writeUInt16LE(5, pos);
  data.writeUInt16LE(0, pos + 2);
  data.writeUInt32LE(structSize, pos + 4);
  pos += 8;
  // attr 2
  data.writeUInt16LE(2, pos);
  data.writeUInt16LE(0, pos + 2);
  data.writeUInt16LE(memberCount, pos + 4);
  pos += 6;
  // attr 1
  data.writeUInt16LE(1, pos);
  data.writeUInt16LE(0, pos + 2);
  data.writeUInt16LE(handle, pos + 4);
  return data;
}

/** Build a Read Template response for a simple struct: DINT myVal, REAL myFloat */
function buildSimpleTemplateResponse(): Buffer {
  const members = Buffer.alloc(16); // 2 members × 8 bytes
  // Member 1: DINT myVal, info=0, offset=0
  members.writeUInt16LE(0, 0);
  members.writeUInt16LE(CIPDataType.DINT, 2);
  members.writeUInt32LE(0, 4);
  // Member 2: REAL myFloat, info=0, offset=4
  members.writeUInt16LE(0, 8);
  members.writeUInt16LE(CIPDataType.REAL, 10);
  members.writeUInt32LE(4, 12);

  const strings = Buffer.from('SimpleUDT\0myVal\0myFloat\0');
  return Buffer.concat([members, strings]);
}

describe('fetchTemplate', () => {
  it('fetches and caches a template', async () => {
    const registry = new TagRegistry();

    const sendCIP = async (req: Buffer): Promise<Buffer> => {
      const service = req[0];
      if (service === CIPService.GET_ATTRIBUTES) {
        return wrapMR(service, buildAttrResponse(10, 8, 2, 0xabcd));
      }
      // Read Template
      return wrapMR(service, buildSimpleTemplateResponse());
    };

    const template = await fetchTemplate(sendCIP, registry, 0x100);

    expect(template.name).toBe('SimpleUDT');
    expect(template.members).toHaveLength(2);
    expect(template.members[0].name).toBe('myVal');
    expect(template.members[1].name).toBe('myFloat');
    expect(template.attributes.structureHandle).toBe(0xabcd);

    // Should be cached
    expect(registry.lookupTemplate(0x100)).toBe(template);
  });

  it('returns cached template without sending CIP', async () => {
    const registry = new TagRegistry();
    const existing = {
      name: 'Cached',
      attributes: {
        id: 1,
        objectDefinitionSize: 1,
        structureSize: 4,
        memberCount: 0,
        structureHandle: 0,
      },
      members: [],
    };
    registry.registerTemplate(0x200, existing);

    let called = false;
    const sendCIP = async () => {
      called = true;
      return Buffer.alloc(0);
    };

    const result = await fetchTemplate(sendCIP, registry, 0x200);
    expect(result).toBe(existing);
    expect(called).toBe(false);
  });

  it('handles fragmented read template (status 0x06)', async () => {
    const registry = new TagRegistry();
    const fullData = buildSimpleTemplateResponse();
    const split = 16; // split after member definitions, before strings

    const sendCIP = async (req: Buffer): Promise<Buffer> => {
      const service = req[0];
      if (service === CIPService.GET_ATTRIBUTES) {
        return wrapMR(service, buildAttrResponse(10, 8, 2, 0xabcd));
      }
      // First read: return first half with status 0x06
      if (req.length > 0) {
        const pathWords = req[1];
        const dataStart = 2 + pathWords * 2;
        const offset = req.readUInt32LE(dataStart);
        if (offset === 0) {
          return wrapMR(service, fullData.subarray(0, split), 0x06);
        }
        // Second read: return remainder with status 0
        return wrapMR(service, fullData.subarray(split));
      }
      return wrapMR(service, fullData);
    };

    const template = await fetchTemplate(sendCIP, registry, 0x300);
    expect(template.name).toBe('SimpleUDT');
    expect(template.members).toHaveLength(2);
  });

  it('throws CIPError on failed get attributes', async () => {
    const registry = new TagRegistry();
    const sendCIP = async (req: Buffer): Promise<Buffer> => {
      return wrapMR(req[0], Buffer.alloc(0), 0x05); // path unknown
    };

    await expect(fetchTemplate(sendCIP, registry, 0x999)).rejects.toThrow();
  });

  it('recursively fetches nested struct templates', async () => {
    const registry = new TagRegistry();

    // Inner template: 1 member DINT
    const innerMembers = Buffer.alloc(8);
    innerMembers.writeUInt16LE(0, 0);
    innerMembers.writeUInt16LE(0x00c4, 2); // DINT
    innerMembers.writeUInt32LE(0, 4);
    const innerStrings = Buffer.from('Inner\0val\0');
    const innerData = Buffer.concat([innerMembers, innerStrings]);

    // Outer template: 1 member that is a struct (type code 0x50, isStruct flag set)
    const outerMembers = Buffer.alloc(8);
    outerMembers.writeUInt16LE(0, 0);
    outerMembers.writeUInt16LE(0x8050, 2); // struct flag | instance 0x50
    outerMembers.writeUInt32LE(0, 4);
    const outerStrings = Buffer.from('Outer\0child\0');
    const outerData = Buffer.concat([outerMembers, outerStrings]);

    const sendCIP = async (req: Buffer): Promise<Buffer> => {
      const service = req[0];
      if (service === CIPService.GET_ATTRIBUTES) {
        // Check which instance is being queried by looking at the path
        const pathWords = req[1];
        const instanceByte = req[2 + pathWords * 2 - 1]; // last byte of path = instance
        if (instanceByte === 0x50) {
          return wrapMR(service, buildAttrResponse(8, 4, 1, 0x1111));
        }
        return wrapMR(service, buildAttrResponse(8, 4, 1, 0x2222));
      }
      // Read Template — check instance
      const pathWords = req[1];
      const instanceByte = req[2 + pathWords * 2 - 1];
      if (instanceByte === 0x50) {
        return wrapMR(service, innerData);
      }
      return wrapMR(service, outerData);
    };

    const template = await fetchTemplate(sendCIP, registry, 0x60);
    expect(template.name).toBe('Outer');
    expect(template.members[0].type.isStruct).toBe(true);

    // Inner template should also be cached
    const inner = registry.lookupTemplate(0x50);
    expect(inner).toBeDefined();
    expect(inner!.name).toBe('Inner');
  });

  it('throws CIPError on failed read template', async () => {
    const registry = new TagRegistry();
    const sendCIP = async (req: Buffer): Promise<Buffer> => {
      const service = req[0];
      if (service === CIPService.GET_ATTRIBUTES) {
        return wrapMR(service, buildAttrResponse(10, 8, 2, 0xabcd));
      }
      return wrapMR(service, Buffer.alloc(0), 0x08); // service not supported
    };

    await expect(fetchTemplate(sendCIP, registry, 0x999)).rejects.toThrow();
  });
});
