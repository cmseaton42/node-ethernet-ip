import { PLC } from '@/plc/plc';
import { MockTransport } from '@/transport/mock-transport';
import { EIPCommand } from '@/encapsulation/commands';
import { buildCPF, CPFItem, CPFItemType } from '@/encapsulation/common-packet-format';
import { CIPService, REPLY_FLAG } from '@/cip/services';

const SESSION_ID = 0x1234;
const CONNECTION_ID = 0x12345678;
const STATUS_SUCCESS = 0x00;
const STATUS_PARTIAL_TRANSFER = 0x06;

/** Atomic DINT. Atomic types avoid template fetches, which would add packets. */
const TYPE_DINT = 0x00c4;
/** Reserved bit set, as program entries typically have on a real PLC. */
const TYPE_PROGRAM_ENTRY = 0x1068;

/** Wrap CPF items in an EIP header + interface handle (4) + timeout (2). */
function buildEIPReply(command: EIPCommand, items: CPFItem[]): Buffer {
  const payload = Buffer.concat([Buffer.alloc(6), buildCPF(items)]);
  const header = Buffer.alloc(24);
  header.writeUInt16LE(command, 0);
  header.writeUInt16LE(payload.length, 2);
  header.writeUInt32LE(SESSION_ID, 4);
  return Buffer.concat([header, payload]);
}

/** Unconnected reply: Null address item + UCMM data item. */
function buildUnconnectedReply(mrReply: Buffer): Buffer {
  return buildEIPReply(EIPCommand.SendRRData, [
    { typeId: CPFItemType.Null, data: Buffer.alloc(0) },
    { typeId: CPFItemType.UCMM, data: mrReply },
  ]);
}

/** Connected reply: connection ID item + data item prefixed with a 2-byte sequence count. */
function buildConnectedReply(mrReply: Buffer): Buffer {
  const connectionId = Buffer.alloc(4);
  connectionId.writeUInt32LE(CONNECTION_ID, 0);
  return buildEIPReply(EIPCommand.SendUnitData, [
    { typeId: CPFItemType.ConnectionBased, data: connectionId },
    {
      typeId: CPFItemType.ConnectedTransportPacket,
      data: Buffer.concat([Buffer.alloc(2), mrReply]),
    },
  ]);
}

function buildRegisterSessionResponse(): Buffer {
  const data = Buffer.alloc(4);
  data.writeUInt16LE(0x01, 0); // protocol version
  const header = Buffer.alloc(24);
  header.writeUInt16LE(EIPCommand.RegisterSession, 0);
  header.writeUInt16LE(data.length, 2);
  header.writeUInt32LE(SESSION_ID, 4);
  return Buffer.concat([header, data]);
}

function buildForwardOpenResponse(): Buffer {
  // service | reply flag, reserved, status, ext. status length, O→T connection ID
  const mrReply = Buffer.alloc(8);
  mrReply.writeUInt8(CIPService.LARGE_FORWARD_OPEN | REPLY_FLAG, 0);
  mrReply.writeUInt32LE(CONNECTION_ID, 4);
  return buildUnconnectedReply(mrReply);
}

function buildTagEntry(id: number, name: string, rawType: number): Buffer {
  const nameBuf = Buffer.from(name, 'ascii');
  const buf = Buffer.alloc(4 + 2 + nameBuf.length + 2 + 12);
  buf.writeUInt32LE(id, 0);
  buf.writeUInt16LE(nameBuf.length, 4);
  nameBuf.copy(buf, 6);
  buf.writeUInt16LE(rawType, 6 + nameBuf.length);
  return buf;
}

function buildTagListReply(status: number, tagData: Buffer): Buffer {
  const mrReply = Buffer.alloc(4 + tagData.length);
  mrReply.writeUInt8(CIPService.GET_INSTANCE_ATTRIBUTE_LIST | REPLY_FLAG, 0);
  mrReply.writeUInt8(status, 2);
  tagData.copy(mrReply, 4);
  return mrReply;
}

/** Partial page, final page naming a program, then that program's own page. */
function buildDiscoveryPages(): Buffer[] {
  return [
    buildTagListReply(STATUS_PARTIAL_TRANSFER, buildTagEntry(1, 'Tag1', TYPE_DINT)),
    buildTagListReply(
      STATUS_SUCCESS,
      Buffer.concat([
        buildTagEntry(2, 'Tag2', TYPE_DINT),
        buildTagEntry(3, 'Program:Main', TYPE_PROGRAM_ENTRY),
      ]),
    ),
    buildTagListReply(STATUS_SUCCESS, buildTagEntry(1, 'LocalTag', TYPE_DINT)),
  ];
}

/** Queue one reply per write, injected on the next tick. */
function autoRespond(transport: MockTransport, responses: Buffer[]): void {
  let idx = 0;
  const origWrite = transport.write.bind(transport);
  transport.write = (data: Buffer) => {
    origWrite(data);
    if (idx < responses.length) {
      const resp = responses[idx++];
      setImmediate(() => transport.injectResponse(resp));
    }
  };
}

function commandsFrom(packets: Buffer[]): number[] {
  return packets.map((packet) => packet.readUInt16LE(0));
}

function expectDiscoveredTags(plc: PLC): void {
  expect(plc.registry.has('Tag1')).toBe(true);
  expect(plc.registry.has('Tag2')).toBe(true);
  expect(plc.registry.has('Program:Main.LocalTag')).toBe(true);
  expect(plc.registry.has('Program:Main')).toBe(false);
}

// No plc.disconnect() below: Forward Close would wait out its 10s timeout without a queued reply.
describe('PLC discovery framing', () => {
  it('uses connected messaging when a connection is open', async () => {
    const transport = new MockTransport();
    autoRespond(transport, [
      buildRegisterSessionResponse(),
      buildForwardOpenResponse(),
      ...buildDiscoveryPages().map(buildConnectedReply),
    ]);
    const plc = new PLC({ transport });

    await plc.connect('127.0.0.1', { discover: true });

    // Check framing first, so old code fails here rather than on its misread replies.
    // Skips RegisterSession and Forward Open.
    expect(commandsFrom(transport.sentData.slice(2))).toEqual([
      EIPCommand.SendUnitData,
      EIPCommand.SendUnitData,
      EIPCommand.SendUnitData,
    ]);
    expectDiscoveredTags(plc);
  });

  it('uses unconnected messaging when connected is false', async () => {
    const transport = new MockTransport();
    autoRespond(transport, [
      buildRegisterSessionResponse(),
      ...buildDiscoveryPages().map(buildUnconnectedReply),
    ]);
    const plc = new PLC({ transport });

    await plc.connect('127.0.0.1', { discover: true, connected: false });

    // Skips RegisterSession; there is no Forward Open.
    expect(commandsFrom(transport.sentData.slice(1))).toEqual([
      EIPCommand.SendRRData,
      EIPCommand.SendRRData,
      EIPCommand.SendRRData,
    ]);
    expectDiscoveredTags(plc);
  });
});
