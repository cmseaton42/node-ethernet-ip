import { PLC } from '@/plc/plc';
import { MockTransport } from '@/transport/mock-transport';
import { CIPDataType } from '@/cip/data-types';

describe('getShape', () => {
  it('returns undefined for atomic tags', () => {
    const plc = new PLC({ transport: new MockTransport() });
    plc.registry.define('twoD', CIPDataType.DINT, 4, false, 2);
    expect(plc.getShape('twoD')).toBeUndefined();
  });

  it('returns undefined for unknown tags', () => {
    const plc = new PLC({ transport: new MockTransport() });
    expect(plc.getShape('nonexistent')).toBeUndefined();
  });
});

describe('getTemplate', () => {
  it('returns undefined for atomic tags', () => {
    const plc = new PLC({ transport: new MockTransport() });
    plc.registry.define('osf', CIPDataType.DINT, 4);
    expect(plc.getTemplate('osf')).toBeUndefined();
  });
});
