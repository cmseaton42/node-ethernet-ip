import { buildCPF, parseCPF, CPFItemType } from '@/encapsulation/common-packet-format';

describe('buildCPF', () => {
  it('builds single Null item', () => {
    const buf = buildCPF([{ typeId: CPFItemType.Null, data: Buffer.alloc(0) }]);
    expect(buf.readUInt16LE(0)).toBe(1); // count
    expect(buf.readUInt16LE(2)).toBe(CPFItemType.Null);
    expect(buf.readUInt16LE(4)).toBe(0); // length
    expect(buf.length).toBe(6);
  });

  it('builds UCMM item with data', () => {
    const data = Buffer.from([0x01, 0x02, 0x03]);
    const buf = buildCPF([{ typeId: CPFItemType.UCMM, data }]);
    expect(buf.readUInt16LE(0)).toBe(1);
    expect(buf.readUInt16LE(2)).toBe(CPFItemType.UCMM);
    expect(buf.readUInt16LE(4)).toBe(3);
    expect(buf.subarray(6)).toEqual(data);
  });

  it('builds multiple items', () => {
    const items = [
      { typeId: CPFItemType.Null, data: Buffer.alloc(0) },
      { typeId: CPFItemType.UCMM, data: Buffer.from([0xaa]) },
    ];
    const buf = buildCPF(items);
    expect(buf.readUInt16LE(0)).toBe(2);
  });
});

describe('parseCPF', () => {
  it('extracts correct items', () => {
    const data = Buffer.from([0xff]);
    const buf = buildCPF([
      { typeId: CPFItemType.Null, data: Buffer.alloc(0) },
      { typeId: CPFItemType.UCMM, data },
    ]);
    const items = parseCPF(buf);
    expect(items).toHaveLength(2);
    expect(items[0].typeId).toBe(CPFItemType.Null);
    expect(items[0].data.length).toBe(0);
    expect(items[1].typeId).toBe(CPFItemType.UCMM);
    expect(Buffer.from(items[1].data)).toEqual(data);
  });

  it('handles zero items', () => {
    const buf = Buffer.alloc(2); // count = 0
    expect(parseCPF(buf)).toEqual([]);
  });

  it('round-trips correctly', () => {
    const original = [
      { typeId: CPFItemType.ConnectionBased, data: Buffer.from([1, 2, 3, 4]) },
      { typeId: CPFItemType.ConnectedTransportPacket, data: Buffer.from([5, 6]) },
    ];
    const items = parseCPF(buildCPF(original));
    expect(items).toHaveLength(2);
    expect(items[0].typeId).toBe(CPFItemType.ConnectionBased);
    expect(Buffer.from(items[0].data)).toEqual(original[0].data);
    expect(items[1].typeId).toBe(CPFItemType.ConnectedTransportPacket);
    expect(Buffer.from(items[1].data)).toEqual(original[1].data);
  });
});
