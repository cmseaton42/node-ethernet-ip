import { buildSymbolicSegment } from '@/cip/epath/segments/symbolic';
import { buildElementSegment } from '@/cip/epath/segments/element';

describe('buildSymbolicSegment', () => {
  it('encodes "MyTag" with pad byte', () => {
    const buf = buildSymbolicSegment('MyTag');
    // [0x91, 0x05, 'M', 'y', 'T', 'a', 'g', 0x00(pad)]
    expect(buf).toEqual(Buffer.from([0x91, 0x05, 0x4d, 0x79, 0x54, 0x61, 0x67, 0x00]));
  });

  it('encodes even-length name without pad', () => {
    const buf = buildSymbolicSegment('Test');
    // [0x91, 0x04, 'T', 'e', 's', 't'] = 6 bytes (even)
    expect(buf.length).toBe(6);
    expect(buf[0]).toBe(0x91);
    expect(buf[1]).toBe(0x04);
  });

  it('encodes "AB" as 4 bytes', () => {
    const buf = buildSymbolicSegment('AB');
    expect(buf).toEqual(Buffer.from([0x91, 0x02, 0x41, 0x42]));
  });

  it('always produces even-length output', () => {
    expect(buildSymbolicSegment('A').length % 2).toBe(0);
    expect(buildSymbolicSegment('AB').length % 2).toBe(0);
    expect(buildSymbolicSegment('ABC').length % 2).toBe(0);
  });
});

describe('buildElementSegment', () => {
  it('encodes index 0 as [0x28, 0x00]', () => {
    expect(buildElementSegment(0)).toEqual(Buffer.from([0x28, 0x00]));
  });

  it('encodes index 3 as [0x28, 0x03]', () => {
    expect(buildElementSegment(3)).toEqual(Buffer.from([0x28, 0x03]));
  });

  it('encodes index 255 as 8-bit', () => {
    const buf = buildElementSegment(255);
    expect(buf.length).toBe(2);
    expect(buf[0]).toBe(0x28);
  });

  it('encodes index 256 as 16-bit', () => {
    const buf = buildElementSegment(256);
    expect(buf.length).toBe(4);
    expect(buf[0]).toBe(0x29);
    expect(buf[1]).toBe(0x00); // pad
    expect(buf.readUInt16LE(2)).toBe(256);
  });

  it('encodes index 300 as 16-bit', () => {
    const buf = buildElementSegment(300);
    expect(buf.length).toBe(4);
    expect(buf[0]).toBe(0x29);
    expect(buf.readUInt16LE(2)).toBe(300);
  });

  it('encodes index 70000 as 32-bit', () => {
    const buf = buildElementSegment(70000);
    expect(buf.length).toBe(6);
    expect(buf[0]).toBe(0x2a);
    expect(buf.readUInt32LE(2)).toBe(70000);
  });

  it('throws on negative index', () => {
    expect(() => buildElementSegment(-1)).toThrow();
  });

  it('throws on non-integer index', () => {
    expect(() => buildElementSegment(1.5)).toThrow();
  });
});
