import { buildTagPath, extractBitIndex } from '@/plc/tag-path';

describe('buildTagPath', () => {
  it('builds simple tag name', () => {
    const path = buildTagPath('MyTag');
    // Should be symbolic segment: [0x91, 0x05, M, y, T, a, g, 0x00]
    expect(path[0]).toBe(0x91);
    expect(path[1]).toBe(5);
  });

  it('builds tag with array index', () => {
    const path = buildTagPath('MyArray[3]');
    // Symbolic 'MyArray' + Element 3
    expect(path[0]).toBe(0x91); // symbolic
    // Element segment should be near the end
    const lastTwo = path.subarray(path.length - 2);
    expect(lastTwo[0]).toBe(0x28); // element UINT8
    expect(lastTwo[1]).toBe(3);
  });

  it('builds tag with member access', () => {
    const path = buildTagPath('MyUDT.Member');
    // Two symbolic segments
    expect(path[0]).toBe(0x91);
    // Find second 0x91
    let count = 0;
    for (let i = 0; i < path.length; i++) {
      if (path[i] === 0x91) count++;
    }
    expect(count).toBe(2);
  });

  it('builds program-scoped tag', () => {
    const path = buildTagPath('Program:MainProgram.MyTag');
    expect(path[0]).toBe(0x91); // 'Program:MainProgram'
  });

  it('skips bit index in path', () => {
    // "MyDINT.5" — the ".5" is a bit index, not a member
    const pathWithBit = buildTagPath('MyDINT.5');
    const pathWithout = buildTagPath('MyDINT');
    expect(pathWithBit).toEqual(pathWithout);
  });

  it('builds multi-dim array', () => {
    const path = buildTagPath('Matrix[1,2]');
    // Should have symbolic + two element segments
    expect(path[0]).toBe(0x91);
  });
});

describe('extractBitIndex', () => {
  it('returns bit index for "Tag.5"', () => {
    expect(extractBitIndex('MyDINT.5')).toBe(5);
  });

  it('returns bit index for "Tag.31"', () => {
    expect(extractBitIndex('MyDINT.31')).toBe(31);
  });

  it('returns null for "Tag.Member"', () => {
    expect(extractBitIndex('MyUDT.Member')).toBeNull();
  });

  it('returns null for plain tag', () => {
    expect(extractBitIndex('MyTag')).toBeNull();
  });

  it('returns null for bit > 31', () => {
    expect(extractBitIndex('MyTag.32')).toBeNull();
  });
});
