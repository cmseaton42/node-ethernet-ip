import {
  encodeConnectionParams,
  Owner,
  ConnectionType,
  Priority,
  FixedVar,
  buildForwardOpenData,
  buildLargeForwardOpenData,
  buildForwardCloseData,
} from '@/cip/connection-manager';

describe('encodeConnectionParams', () => {
  it('encodes Exclusive/PointToPoint/Low/Variable/500', () => {
    const params = encodeConnectionParams(
      Owner.Exclusive,
      ConnectionType.PointToPoint,
      Priority.Low,
      FixedVar.Variable,
      500,
    );
    // bit 15=0, bits 14-13=10, bits 11-10=00, bit 9=1, bits 8-0=500(0x1F4)
    expect(params & 0x01ff).toBe(500); // size in low 9 bits
    expect((params >> 9) & 1).toBe(1); // variable
    expect((params >> 13) & 3).toBe(2); // point-to-point
  });
});

describe('buildForwardOpenData', () => {
  it('produces 35 bytes', () => {
    const buf = buildForwardOpenData({ connectionSerial: 0x1234, toConnectionId: 0x5678 });
    expect(buf.length).toBe(35);
  });

  it('has Transport Class 3 trigger as last byte', () => {
    const buf = buildForwardOpenData({ connectionSerial: 1 });
    expect(buf[34]).toBe(0xa3);
  });

  it('sets O→T Connection ID to 0 (PLC assigns)', () => {
    const buf = buildForwardOpenData({ connectionSerial: 1 });
    expect(buf.readUInt32LE(2)).toBe(0);
  });

  it('uses all defaults when called with no arguments', () => {
    const buf = buildForwardOpenData();
    expect(buf.length).toBe(35);
    expect(buf[34]).toBe(0xa3);
  });

  it('uses all explicit options', () => {
    const buf = buildForwardOpenData({
      rpiMicroseconds: 10000,
      connectionParams: 0x43f4,
      timeoutMs: 2000,
      timeoutMultiplier: 8,
      connectionSerial: 0xaaaa,
      toConnectionId: 0xbbbb,
      vendorId: 0xcccc,
      originatorSerial: 0xdddddddd,
    });
    expect(buf.length).toBe(35);
    expect(buf.readUInt32LE(6)).toBe(0xbbbb); // T→O Connection ID
    expect(buf.readUInt16LE(10)).toBe(0xaaaa); // Connection Serial
    expect(buf.readUInt16LE(12)).toBe(0xcccc); // Vendor ID
    expect(buf.readUInt32LE(14)).toBe(0xdddddddd); // Originator Serial
  });
});

describe('buildLargeForwardOpenData', () => {
  it('produces 39 bytes', () => {
    const buf = buildLargeForwardOpenData({ connectionSerial: 1, toConnectionId: 1 });
    expect(buf.length).toBe(39);
  });

  it('has Transport Class 3 trigger as last byte', () => {
    const buf = buildLargeForwardOpenData({ connectionSerial: 1 });
    expect(buf[38]).toBe(0xa3);
  });

  it('uses defaults when no options provided', () => {
    const buf = buildLargeForwardOpenData();
    expect(buf.length).toBe(39);
    expect(buf[38]).toBe(0xa3);
  });

  it('uses all explicit options', () => {
    const buf = buildLargeForwardOpenData({
      rpiMicroseconds: 10000,
      connectionParams: 4002,
      timeoutMs: 2000,
      timeoutMultiplier: 16,
      connectionSerial: 0x1111,
      toConnectionId: 0x2222,
      vendorId: 0x3333,
      originatorSerial: 0x44444444,
    });
    expect(buf.length).toBe(39);
    expect(buf.readUInt32LE(6)).toBe(0x2222); // T→O Connection ID
    expect(buf.readUInt16LE(10)).toBe(0x1111); // Connection Serial
    expect(buf.readUInt16LE(12)).toBe(0x3333); // Vendor ID
    expect(buf.readUInt32LE(14)).toBe(0x44444444); // Originator Serial
  });
});

describe('buildForwardCloseData', () => {
  it('produces 10 bytes', () => {
    const buf = buildForwardCloseData({ connectionSerial: 0x4242 });
    expect(buf.length).toBe(10);
  });

  it('contains the connection serial', () => {
    const buf = buildForwardCloseData({ connectionSerial: 0x1234 });
    expect(buf.readUInt16LE(2)).toBe(0x1234);
  });

  it('uses custom vendor and originator serial', () => {
    const buf = buildForwardCloseData({
      connectionSerial: 1,
      vendorId: 0xaaaa,
      originatorSerial: 0xbbbbbbbb,
    });
    expect(buf.readUInt16LE(4)).toBe(0xaaaa);
    expect(buf.readUInt32LE(6)).toBe(0xbbbbbbbb);
  });
});
