import { buildPortSegment } from '@/cip/epath/segments/port';

describe('buildPortSegment', () => {
  it('builds backplane port 1, slot 0', () => {
    const buf = buildPortSegment(1, 0);
    expect(buf.length).toBe(2); // even padded
    expect(buf[0]).toBe(0x01); // port 1 in low nibble
    expect(buf[1]).toBe(0x00); // link = slot 0
  });

  it('builds backplane port 1, slot 2', () => {
    const buf = buildPortSegment(1, 2);
    expect(buf[0]).toBe(0x01);
    expect(buf[1]).toBe(0x02);
  });

  it('builds port < 15 with single byte link', () => {
    const buf = buildPortSegment(5, 3);
    expect(buf[0]).toBe(0x05);
    expect(buf[1]).toBe(0x03);
  });

  it('builds port >= 15 with extended port', () => {
    const buf = buildPortSegment(20, 1);
    // portId = 0x0F (extended port marker)
    expect(buf[0]).toBe(0x0f);
    // port follows as UINT16LE
    expect(buf.readUInt16LE(1)).toBe(20);
    // link byte
    expect(buf[3]).toBe(0x01);
    // should be even length
    expect(buf.length % 2).toBe(0);
  });

  it('builds with string link address', () => {
    const buf = buildPortSegment(1, '192.168.1.1');
    // extended link flag should be set (link > 1 byte)
    expect(buf[0] & 0x10).toBe(0x10);
    // port 1 in low nibble
    expect(buf[0] & 0x0f).toBe(0x01);
    // result is even length
    expect(buf.length % 2).toBe(0);
  });

  it('always pads to even length', () => {
    // port 1, link 0 = 2 bytes (already even)
    expect(buildPortSegment(1, 0).length % 2).toBe(0);
    // port 20, link 1 = header(3) + link(1) = 4 (even)
    expect(buildPortSegment(20, 1).length % 2).toBe(0);
  });

  it('throws on invalid port', () => {
    expect(() => buildPortSegment(0, 1)).toThrow();
    expect(() => buildPortSegment(-1, 1)).toThrow();
  });

  it('builds port >= 15 with extended link', () => {
    const buf = buildPortSegment(20, '192.168.1.1');
    // portId = 0x0F | 0x10 = 0x1F (extended port + extended link)
    expect(buf[0]).toBe(0x1f);
    expect(buf.length % 2).toBe(0);
  });
});
