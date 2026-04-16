import { buildHeader, parseHeader, EIP_HEADER_SIZE } from '@/encapsulation/header';
import { EIPCommand } from '@/encapsulation/commands';

describe('buildHeader', () => {
  it('creates 24-byte header with no data', () => {
    const buf = buildHeader(EIPCommand.NOP);
    expect(buf.length).toBe(EIP_HEADER_SIZE);
    expect(buf.readUInt16LE(0)).toBe(EIPCommand.NOP);
    expect(buf.readUInt16LE(2)).toBe(0); // length = 0
  });

  it('creates header with data payload', () => {
    const data = Buffer.from([0x01, 0x02, 0x03]);
    const buf = buildHeader(EIPCommand.RegisterSession, 0, data);
    expect(buf.length).toBe(EIP_HEADER_SIZE + 3);
    expect(buf.readUInt16LE(2)).toBe(3);
    expect(buf.subarray(EIP_HEADER_SIZE)).toEqual(data);
  });

  it('throws on invalid command', () => {
    expect(() => buildHeader(0xff as EIPCommand)).toThrow();
  });

  it('sets session handle correctly', () => {
    const buf = buildHeader(EIPCommand.UnregisterSession, 0x12345678);
    expect(buf.readUInt32LE(4)).toBe(0x12345678);
  });

  it('produces correct byte layout for RegisterSession', () => {
    const data = Buffer.alloc(4);
    data.writeUInt16LE(0x01, 0);
    const buf = buildHeader(EIPCommand.RegisterSession, 0, data);
    expect(buf.readUInt16LE(0)).toBe(0x65); // command
    expect(buf.readUInt16LE(2)).toBe(4); // data length
    expect(buf.readUInt32LE(4)).toBe(0); // session = 0
    expect(buf.readUInt32LE(8)).toBe(0); // status = 0
    expect(buf.readUInt32LE(20)).toBe(0); // options = 0
    expect(buf.readUInt16LE(24)).toBe(1); // protocol version
    expect(buf.readUInt16LE(26)).toBe(0); // option flags
  });
});

describe('parseHeader', () => {
  it('extracts all fields correctly', () => {
    const data = Buffer.from([0xaa, 0xbb]);
    const buf = buildHeader(EIPCommand.SendRRData, 42, data);
    // Manually set status for testing
    buf.writeUInt32LE(0x01, 8);
    const parsed = parseHeader(buf);
    expect(parsed.commandCode).toBe(EIPCommand.SendRRData);
    expect(parsed.command).toBe('SendRRData');
    expect(parsed.length).toBe(2);
    expect(parsed.session).toBe(42);
    expect(parsed.statusCode).toBe(0x01);
    expect(parsed.status).toContain('invalid');
    expect(parsed.data).toEqual(data);
  });

  it('throws on buffer < 24 bytes', () => {
    expect(() => parseHeader(Buffer.alloc(10))).toThrow();
  });

  it('round-trips correctly', () => {
    const data = Buffer.from([1, 2, 3, 4, 5]);
    const buf = buildHeader(EIPCommand.SendUnitData, 0xdeadbeef, data);
    const parsed = parseHeader(buf);
    expect(parsed.commandCode).toBe(EIPCommand.SendUnitData);
    expect(parsed.session).toBe(0xdeadbeef);
    expect(parsed.statusCode).toBe(0);
    expect(parsed.status).toBe('SUCCESS');
    expect(parsed.length).toBe(5);
    expect(Buffer.from(parsed.data)).toEqual(data);
  });
});
