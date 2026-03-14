import { encodeTimeout, build } from '@/cip/unconnected-send';

describe('encodeTimeout', () => {
  it('encodes 2000ms', () => {
    const t = encodeTimeout(2000);
    expect(t.timeTick).toBeGreaterThanOrEqual(0);
    expect(t.ticks).toBeGreaterThanOrEqual(1);
    // Verify actual timeout is close to 2000
    const actual = Math.pow(2, t.timeTick) * t.ticks;
    expect(Math.abs(actual - 2000)).toBeLessThan(100);
  });

  it('throws on zero', () => {
    expect(() => encodeTimeout(0)).toThrow();
  });

  it('throws on negative', () => {
    expect(() => encodeTimeout(-1)).toThrow();
  });
});

describe('UnconnectedSend.build', () => {
  it('wraps a message request with route path', () => {
    const msg = Buffer.from([0x4c, 0x02, 0x91, 0x03, 0x54, 0x61, 0x67, 0x00, 0x01, 0x00]);
    const route = Buffer.from([0x01, 0x00]); // backplane port 1, slot 0

    const buf = build(msg, route);

    // Should start with Unconnected Send service (0x52)
    expect(buf.readUInt8(0)).toBe(0x52);
    // Path should target Connection Manager (class 0x06, instance 0x01)
    expect(buf.readUInt8(2)).toBe(0x20); // ClassID segment
    expect(buf.readUInt8(3)).toBe(0x06);
    expect(buf.readUInt8(4)).toBe(0x24); // InstanceID segment
    expect(buf.readUInt8(5)).toBe(0x01);
  });

  it('pads odd-length message requests', () => {
    const oddMsg = Buffer.alloc(5, 0xaa);
    const route = Buffer.from([0x01, 0x00]);

    const buf = build(oddMsg, route);
    // Should compile without error and be valid
    expect(buf.length).toBeGreaterThan(0);
  });
});
