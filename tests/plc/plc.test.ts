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

describe('isConnected', () => {
  it('returns false before connect', () => {
    const plc = new PLC({ transport: new MockTransport() });
    expect(plc.isConnected).toBe(false);
  });
});

describe('logger', () => {
  it('accepts a custom logger', () => {
    const logs: string[] = [];
    const logger = {
      debug: (msg: string) => logs.push(`debug:${msg}`),
      info: (msg: string) => logs.push(`info:${msg}`),
      warn: (msg: string) => logs.push(`warn:${msg}`),
      error: (msg: string) => logs.push(`error:${msg}`),
    };
    const plc = new PLC({ transport: new MockTransport(), logger });
    expect(plc.isConnected).toBe(false);
    // Logger accepted without error
    expect(logs).toEqual([]);
  });

  it('defaults to noop logger (no errors)', () => {
    const plc = new PLC({ transport: new MockTransport() });
    expect(plc.isConnected).toBe(false);
  });
});
