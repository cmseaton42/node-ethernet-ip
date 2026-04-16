import { EPathBuilder } from '@/cip/epath/epath-builder';
import { LogicalType } from '@/cip/epath/segments/logical';

describe('EPathBuilder', () => {
  it('builds CIP object path (ClassID + InstanceID)', () => {
    const path = new EPathBuilder()
      .logical(LogicalType.ClassID, 0x06)
      .logical(LogicalType.InstanceID, 0x01)
      .build();

    // ClassID=6: [0x20, 0x06], InstanceID=1: [0x24, 0x01]
    expect(path).toEqual(Buffer.from([0x20, 0x06, 0x24, 0x01]));
  });

  it('builds tag path with symbolic + element', () => {
    const path = new EPathBuilder().symbolic('MyTag').element(3).build();

    // Symbolic 'MyTag': [0x91, 0x05, M, y, T, a, g, 0x00]
    // Element 3: [0x28, 0x03]
    expect(path).toEqual(Buffer.from([0x91, 0x05, 0x4d, 0x79, 0x54, 0x61, 0x67, 0x00, 0x28, 0x03]));
  });

  it('builds routing path (port + slot)', () => {
    const path = new EPathBuilder().port(1, 2).build();

    // Port 1, link 2: [0x01, 0x02]
    expect(path).toEqual(Buffer.from([0x01, 0x02]));
  });

  it('builds complex path with routing + object addressing', () => {
    const path = new EPathBuilder()
      .port(1, 0)
      .logical(LogicalType.ClassID, 0x02)
      .logical(LogicalType.InstanceID, 0x01)
      .build();

    expect(path).toEqual(Buffer.from([0x01, 0x00, 0x20, 0x02, 0x24, 0x01]));
  });

  it('builds UDT member path: Tag.Member', () => {
    const path = new EPathBuilder().symbolic('Tag').symbolic('Member').build();

    // 'Tag': [0x91, 0x03, T, a, g, 0x00(pad)]
    // 'Member': [0x91, 0x06, M, e, m, b, e, r]
    expect(path.length).toBe(14);
    expect(path[0]).toBe(0x91);
  });

  it('returns empty buffer when no segments added', () => {
    const path = new EPathBuilder().build();
    expect(path.length).toBe(0);
  });
});
