import { LogicalType, buildLogicalSegment } from '@/cip/epath/segments/logical';

describe('buildLogicalSegment', () => {
  it('builds 8-bit ClassID=1 as [0x20, 0x01]', () => {
    const buf = buildLogicalSegment(LogicalType.ClassID, 0x01);
    expect(buf).toEqual(Buffer.from([0x20, 0x01]));
  });

  it('builds 8-bit InstanceID=1 as [0x24, 0x01]', () => {
    const buf = buildLogicalSegment(LogicalType.InstanceID, 0x01);
    expect(buf).toEqual(Buffer.from([0x24, 0x01]));
  });

  it('builds 8-bit AttributeID=5 as [0x30, 0x05]', () => {
    const buf = buildLogicalSegment(LogicalType.AttributeID, 0x05);
    expect(buf).toEqual(Buffer.from([0x30, 0x05]));
  });

  it('accepts address 0', () => {
    const buf = buildLogicalSegment(LogicalType.InstanceID, 0);
    expect(buf).toEqual(Buffer.from([0x24, 0x00]));
  });

  it('builds 16-bit address (256) as 4 bytes padded', () => {
    const buf = buildLogicalSegment(LogicalType.ClassID, 256);
    expect(buf.length).toBe(4);
    // segByte = 0x20 | 0x00 | 0x01 (16-bit format) = 0x21
    expect(buf[0]).toBe(0x21);
    expect(buf[1]).toBe(0x00); // pad
    expect(buf.readUInt16LE(2)).toBe(256);
  });

  it('builds 32-bit address (70000) as 6 bytes padded', () => {
    const buf = buildLogicalSegment(LogicalType.ClassID, 70000);
    expect(buf.length).toBe(6);
    // segByte = 0x20 | 0x00 | 0x02 (32-bit format) = 0x22
    expect(buf[0]).toBe(0x22);
    expect(buf[1]).toBe(0x00); // pad
    expect(buf.readUInt32LE(2)).toBe(70000);
  });

  it('throws on negative address', () => {
    expect(() => buildLogicalSegment(LogicalType.ClassID, -1)).toThrow();
  });

  it('throws on non-integer address', () => {
    expect(() => buildLogicalSegment(LogicalType.ClassID, 1.5)).toThrow();
  });

  it('builds each LogicalType with distinct segment byte', () => {
    const types = [
      [LogicalType.ClassID, 0x20],
      [LogicalType.InstanceID, 0x24],
      [LogicalType.MemberID, 0x28],
      [LogicalType.ConnPoint, 0x2c],
      [LogicalType.AttributeID, 0x30],
      [LogicalType.Special, 0x34],
      [LogicalType.ServiceID, 0x38],
    ] as const;

    for (const [type, expectedByte] of types) {
      const buf = buildLogicalSegment(type, 1);
      expect(buf[0]).toBe(expectedByte);
    }
  });
});
