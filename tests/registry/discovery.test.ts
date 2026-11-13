import { discoverAll, isUserTag, extractProgramNames, DiscoveredTag } from '@/registry/discovery';
import { CIPService, REPLY_FLAG } from '@/cip/services';

/**
 * Build a Message Router reply wrapping CIP tag list data.
 */
function buildTagListResponse(cipStatus: number, tagData: Buffer): Buffer {
  // CIP Message Router reply
  const mrReply = Buffer.alloc(4 + tagData.length);
  mrReply.writeUInt8(CIPService.GET_INSTANCE_ATTRIBUTE_LIST | REPLY_FLAG, 0);
  mrReply.writeUInt8(cipStatus, 2); // general status
  mrReply.writeUInt8(0, 3); // extended status length
  tagData.copy(mrReply, 4);
  return mrReply;
}

/** Fake sendCIP that returns the given responses */
function mockSend(...responses: Buffer[]) {
  const requests: Buffer[] = [];
  const send = async (req: Buffer) => {
    requests.push(req);
    return responses[Math.min(requests.length - 1, responses.length - 1)];
  };
  return { send, requests };
}

/**
 * Build tag list data for a single tag entry.
 * Layout: instanceId(4) + nameLength(2) + name(N) + type(2) + dimSizes(12)
 */
function buildTagEntry(id: number, name: string, rawType: number, dimSizes: number[] = []): Buffer {
  const nameBuf = Buffer.from(name, 'ascii');
  const buf = Buffer.alloc(4 + 2 + nameBuf.length + 2 + 12);
  let offset = 0;
  buf.writeUInt32LE(id, offset);
  offset += 4;
  buf.writeUInt16LE(nameBuf.length, offset);
  offset += 2;
  nameBuf.copy(buf, offset);
  offset += nameBuf.length;
  buf.writeUInt16LE(rawType, offset);
  offset += 2;
  for (let d = 0; d < 3; d++) {
    buf.writeUInt32LE(dimSizes[d] ?? 0, offset);
    offset += 4;
  }
  return buf;
}

describe('discoverAll', () => {
  it('discovers tags from a single response', async () => {
    const tagData = Buffer.concat([
      buildTagEntry(1, 'MyDINT', 0x00c4),
      buildTagEntry(2, 'MyREAL', 0x00ca),
    ]);

    const { send } = mockSend(buildTagListResponse(0x00, tagData));

    const tags = await discoverAll(send);

    expect(tags.length).toBe(2);
    expect(tags[0].name).toBe('MyDINT');
    expect(tags[0].type.code).toBe(0xc4);
    expect(tags[1].name).toBe('MyREAL');
    expect(tags[1].type.code).toBe(0xca);
  });

  it('paginates on status 0x06', async () => {
    const page1 = buildTagEntry(1, 'Tag1', 0x00c4);
    const page2 = buildTagEntry(2, 'Tag2', 0x00ca);

    const { send, requests } = mockSend(
      buildTagListResponse(0x06, page1),
      buildTagListResponse(0x00, page2),
    );

    const tags = await discoverAll(send);

    expect(tags.length).toBe(2);
    expect(tags[0].name).toBe('Tag1');
    expect(tags[1].name).toBe('Tag2');
    expect(requests.length).toBe(2);
    expect(requests[1]).not.toEqual(requests[0]);
  });

  it('stops on error status', async () => {
    const { send } = mockSend(buildTagListResponse(0x08, Buffer.alloc(0)));

    const tags = await discoverAll(send);
    expect(tags.length).toBe(0);
  });

  it('passes program scope', async () => {
    const tagData = buildTagEntry(1, 'LocalTag', 0x00c3);

    const { send, requests } = mockSend(buildTagListResponse(0x00, tagData));

    const tags = await discoverAll(send, 'MainProgram');

    expect(tags.length).toBe(1);
    expect(tags[0].program).toBe('MainProgram');
    expect(requests[0].includes(Buffer.from('Program:MainProgram', 'ascii'))).toBe(true);
  });

  it('parses array dimension sizes from attribute 8', async () => {
    const tagData = Buffer.concat([
      buildTagEntry(1, 'arr1D', 0x20c4, [10]), // 1D DINT[10]
      buildTagEntry(2, 'arr2D', 0x40c4, [3, 5]), // 2D DINT[3,5]
      buildTagEntry(3, 'arr3D', 0x60c4, [2, 3, 4]), // 3D DINT[2,3,4]
      buildTagEntry(4, 'scalar', 0x00c4), // 0D DINT
    ]);

    const { send } = mockSend(buildTagListResponse(0x00, tagData));

    const tags = await discoverAll(send);

    expect(tags[0].type.dimSizes).toEqual([10]);
    expect(tags[1].type.dimSizes).toEqual([3, 5]);
    expect(tags[2].type.dimSizes).toEqual([2, 3, 4]);
    expect(tags[3].type.dimSizes).toEqual([]);
  });
});

function makeTag(name: string, overrides?: Partial<DiscoveredTag['type']>): DiscoveredTag {
  return {
    id: 1,
    name,
    type: {
      code: 0xc4,
      isStruct: false,
      isReserved: false,
      arrayDims: 0,
      dimSizes: [],
      ...overrides,
    },
    program: null,
  };
}

describe('isUserTag', () => {
  it('keeps normal atomic tags', () => {
    expect(isUserTag(makeTag('errorCount'))).toBe(true);
  });

  it('keeps struct tags', () => {
    expect(isUserTag(makeTag('hmiStatus', { isStruct: true, code: 0x0646 }))).toBe(true);
  });

  it('discards reserved tags (bit 12)', () => {
    expect(isUserTag(makeTag('Task:MainTask', { isReserved: true }))).toBe(false);
  });

  it('discards __ prefix tags', () => {
    expect(isUserTag(makeTag('__CONTAINER'))).toBe(false);
  });

  it('discards Map: tags', () => {
    expect(isUserTag(makeTag('Map:Local'))).toBe(false);
  });

  it('discards Cxn: tags', () => {
    expect(isUserTag(makeTag('Cxn:Standard:abc123'))).toBe(false);
  });

  it('discards module I/O tags', () => {
    expect(isUserTag(makeTag('Codesys:I', { isStruct: true }))).toBe(false);
  });

  it('keeps Program: entries (they are filtered elsewhere as scope markers)', () => {
    expect(isUserTag(makeTag('Program:MainProgram'))).toBe(true);
  });
});

describe('extractProgramNames', () => {
  it('extracts program names from Program: entries', () => {
    const tags = [
      makeTag('Program:MainProgram', { isReserved: true }),
      makeTag('Program:SafetyProgram', { isReserved: true }),
      makeTag('trigger'),
      makeTag('Task:MainTask', { isReserved: true }),
    ];
    expect(extractProgramNames(tags)).toEqual(['MainProgram', 'SafetyProgram']);
  });

  it('returns empty for no programs', () => {
    const tags = [makeTag('trigger'), makeTag('status')];
    expect(extractProgramNames(tags)).toEqual([]);
  });
});
