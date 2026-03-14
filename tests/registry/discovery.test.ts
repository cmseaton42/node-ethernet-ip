import { discoverAll } from '@/registry/discovery';
import { MockTransport } from '@/transport/mock-transport';
import { RequestPipeline } from '@/pipeline/request-pipeline';
import { EIPCommand } from '@/encapsulation/commands';
import { CIPService, REPLY_FLAG } from '@/cip/services';

/**
 * Build a mock SendRRData response wrapping CIP tag list data.
 */
function buildTagListResponse(sessionId: number, cipStatus: number, tagData: Buffer): Buffer {
  // CIP Message Router reply
  const mrReply = Buffer.alloc(4 + tagData.length);
  mrReply.writeUInt8(CIPService.GET_INSTANCE_ATTRIBUTE_LIST | REPLY_FLAG, 0);
  mrReply.writeUInt8(cipStatus, 2); // general status
  mrReply.writeUInt8(0, 3); // extended status length
  tagData.copy(mrReply, 4);

  // CPF: Null item + UCMM item
  const nullItem = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const ucmmHeader = Buffer.alloc(4);
  ucmmHeader.writeUInt16LE(0x00b2, 0);
  ucmmHeader.writeUInt16LE(mrReply.length, 2);

  // Interface Handle(4) + Timeout(2) + ItemCount(2)
  const prefix = Buffer.alloc(8);
  prefix.writeUInt16LE(2, 6); // item count
  const payload = Buffer.concat([prefix, nullItem, ucmmHeader, mrReply]);

  // EIP header
  const header = Buffer.alloc(24);
  header.writeUInt16LE(EIPCommand.SendRRData, 0);
  header.writeUInt16LE(payload.length, 2);
  header.writeUInt32LE(sessionId, 4);
  return Buffer.concat([header, payload]);
}

/**
 * Build tag list data for a single tag entry.
 * Layout: instanceId(4) + nameLength(2) + name(N) + type(2)
 */
function buildTagEntry(id: number, name: string, rawType: number): Buffer {
  const nameBuf = Buffer.from(name, 'ascii');
  const buf = Buffer.alloc(4 + 2 + nameBuf.length + 2);
  let offset = 0;
  buf.writeUInt32LE(id, offset);
  offset += 4;
  buf.writeUInt16LE(nameBuf.length, offset);
  offset += 2;
  nameBuf.copy(buf, offset);
  offset += nameBuf.length;
  buf.writeUInt16LE(rawType, offset);
  return buf;
}

describe('discoverAll', () => {
  let transport: MockTransport;
  let pipeline: RequestPipeline;

  beforeEach(async () => {
    transport = new MockTransport();
    await transport.connect('127.0.0.1', 44818);
    pipeline = new RequestPipeline(transport);
  });

  it('discovers tags from a single response', async () => {
    const tagData = Buffer.concat([
      buildTagEntry(1, 'MyDINT', 0x00c4),
      buildTagEntry(2, 'MyREAL', 0x00ca),
    ]);

    // Auto-respond on write
    const origWrite = transport.write.bind(transport);
    transport.write = (data: Buffer) => {
      origWrite(data);
      setImmediate(() => {
        transport.injectResponse(buildTagListResponse(0x01, 0x00, tagData));
      });
    };

    const tags = await discoverAll(pipeline, 0x01, 5000);

    expect(tags.length).toBe(2);
    expect(tags[0].name).toBe('MyDINT');
    expect(tags[0].type.code).toBe(0xc4);
    expect(tags[1].name).toBe('MyREAL');
    expect(tags[1].type.code).toBe(0xca);
  });

  it('paginates on status 0x06', async () => {
    const page1 = buildTagEntry(1, 'Tag1', 0x00c4);
    const page2 = buildTagEntry(2, 'Tag2', 0x00ca);

    let callCount = 0;
    const origWrite = transport.write.bind(transport);
    transport.write = (data: Buffer) => {
      origWrite(data);
      callCount++;
      setImmediate(() => {
        if (callCount === 1) {
          // First response: partial transfer (0x06)
          transport.injectResponse(buildTagListResponse(0x01, 0x06, page1));
        } else {
          // Second response: success (0x00)
          transport.injectResponse(buildTagListResponse(0x01, 0x00, page2));
        }
      });
    };

    const tags = await discoverAll(pipeline, 0x01, 5000);

    expect(tags.length).toBe(2);
    expect(tags[0].name).toBe('Tag1');
    expect(tags[1].name).toBe('Tag2');
    expect(callCount).toBe(2);
  });

  it('stops on error status', async () => {
    const origWrite = transport.write.bind(transport);
    transport.write = (data: Buffer) => {
      origWrite(data);
      setImmediate(() => {
        transport.injectResponse(buildTagListResponse(0x01, 0x08, Buffer.alloc(0)));
      });
    };

    const tags = await discoverAll(pipeline, 0x01, 5000);
    expect(tags.length).toBe(0);
  });

  it('passes program scope', async () => {
    const tagData = buildTagEntry(1, 'LocalTag', 0x00c3);

    const origWrite = transport.write.bind(transport);
    transport.write = (data: Buffer) => {
      origWrite(data);
      setImmediate(() => {
        transport.injectResponse(buildTagListResponse(0x01, 0x00, tagData));
      });
    };

    const tags = await discoverAll(pipeline, 0x01, 5000, 'MainProgram');

    expect(tags.length).toBe(1);
    expect(tags[0].program).toBe('MainProgram');
  });
});
