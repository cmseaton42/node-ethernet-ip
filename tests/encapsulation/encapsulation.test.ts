import {
  registerSession,
  unregisterSession,
  sendRRData,
  sendUnitData,
} from '@/encapsulation/encapsulation';
import { parseHeader, EIP_HEADER_SIZE } from '@/encapsulation/header';
import { parseCPF, CPFItemType } from '@/encapsulation/common-packet-format';
import { EIPCommand } from '@/encapsulation/commands';

describe('registerSession', () => {
  it('produces 28-byte packet', () => {
    const buf = registerSession();
    expect(buf.length).toBe(28); // 24 header + 4 data
  });

  it('has correct command and data', () => {
    const buf = registerSession();
    const parsed = parseHeader(buf);
    expect(parsed.commandCode).toBe(EIPCommand.RegisterSession);
    expect(parsed.session).toBe(0);
    expect(parsed.length).toBe(4);
    expect(parsed.data.readUInt16LE(0)).toBe(0x01); // protocol version
    expect(parsed.data.readUInt16LE(2)).toBe(0x00); // option flags
  });
});

describe('unregisterSession', () => {
  it('uses correct session and no data', () => {
    const buf = unregisterSession(0xaabbccdd);
    const parsed = parseHeader(buf);
    expect(parsed.commandCode).toBe(EIPCommand.UnregisterSession);
    expect(parsed.session).toBe(0xaabbccdd);
    expect(parsed.length).toBe(0);
  });
});

describe('sendRRData', () => {
  it('has correct structure', () => {
    const cipData = Buffer.from([0x01, 0x02, 0x03]);
    const buf = sendRRData(99, cipData, 5);
    const parsed = parseHeader(buf);
    expect(parsed.commandCode).toBe(EIPCommand.SendRRData);
    expect(parsed.session).toBe(99);

    const payload = parsed.data;
    expect(payload.readUInt32LE(0)).toBe(0); // Interface Handle
    expect(payload.readUInt16LE(4)).toBe(5); // timeout

    const items = parseCPF(payload.subarray(6));
    expect(items).toHaveLength(2);
    expect(items[0].typeId).toBe(CPFItemType.Null);
    expect(items[0].data.length).toBe(0);
    expect(items[1].typeId).toBe(CPFItemType.UCMM);
    expect(Buffer.from(items[1].data)).toEqual(cipData);
  });

  it('round-trips CIP data', () => {
    const cipData = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    const buf = sendRRData(1, cipData);
    const parsed = parseHeader(buf);
    const items = parseCPF(parsed.data.subarray(6));
    expect(Buffer.from(items[1].data)).toEqual(cipData);
  });
});

describe('sendUnitData', () => {
  it('uses ConnectionBased (0xA1) NOT SequencedAddrItem', () => {
    const cipData = Buffer.from([0x01]);
    const buf = sendUnitData(10, cipData, 0x12345678, 42);
    const parsed = parseHeader(buf);
    expect(parsed.commandCode).toBe(EIPCommand.SendUnitData);

    const payload = parsed.data;
    expect(payload.readUInt32LE(0)).toBe(0); // Interface Handle
    expect(payload.readUInt16LE(4)).toBe(0); // Timeout always 0

    const items = parseCPF(payload.subarray(6));
    expect(items).toHaveLength(2);
    expect(items[0].typeId).toBe(CPFItemType.ConnectionBased);
    expect(items[0].typeId).not.toBe(CPFItemType.SequencedAddrItem);
    expect(items[0].data.readUInt32LE(0)).toBe(0x12345678);
    expect(items[0].data.length).toBe(4);
  });

  it('puts sequence count as UINT16LE prefix in ConnectedTransportPacket data', () => {
    const cipData = Buffer.from([0xaa, 0xbb]);
    const buf = sendUnitData(10, cipData, 1, 0x1234);
    const parsed = parseHeader(buf);
    const items = parseCPF(parsed.data.subarray(6));

    expect(items[1].typeId).toBe(CPFItemType.ConnectedTransportPacket);
    expect(items[1].data.readUInt16LE(0)).toBe(0x1234); // sequence count
    expect(Buffer.from(items[1].data.subarray(2))).toEqual(cipData);
  });

  it('round-trips connection ID, sequence count, and CIP data', () => {
    const cipData = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    const connId = 0xdeadbeef;
    const seqCount = 500;
    const buf = sendUnitData(77, cipData, connId, seqCount);
    const parsed = parseHeader(buf);
    const items = parseCPF(parsed.data.subarray(6));

    expect(items[0].data.readUInt32LE(0)).toBe(connId);
    expect(items[1].data.readUInt16LE(0)).toBe(seqCount);
    expect(Buffer.from(items[1].data.subarray(2))).toEqual(cipData);
  });
});
