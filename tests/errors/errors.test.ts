import {
  EIPError,
  ConnectionError,
  SessionError,
  ForwardOpenError,
  TimeoutError,
  CIPError,
  TagNotFoundError,
  TypeMismatchError,
  FragmentationError,
  getStatusMessage,
  CIP_STATUS_CODES,
} from '@/errors';

describe('EIPError', () => {
  it('has name, message, code, and context', () => {
    const err = new EIPError('test', 42, { foo: 'bar' });
    expect(err.name).toBe('EIPError');
    expect(err.message).toBe('test');
    expect(err.code).toBe(42);
    expect(err.context).toEqual({ foo: 'bar' });
    expect(err).toBeInstanceOf(Error);
  });
});

describe('ConnectionError', () => {
  it('is instanceof EIPError', () => {
    const err = new ConnectionError('TCP refused');
    expect(err).toBeInstanceOf(EIPError);
    expect(err.name).toBe('ConnectionError');
  });
});

describe('SessionError', () => {
  it('carries status code', () => {
    const err = new SessionError('Registration failed', 0x64);
    expect(err.code).toBe(0x64);
    expect(err).toBeInstanceOf(EIPError);
  });
});

describe('ForwardOpenError', () => {
  it('carries rejection reason', () => {
    const err = new ForwardOpenError('Rejected', 0x01);
    expect(err.rejectionReason).toBe(0x01);
    expect(err.name).toBe('ForwardOpenError');
    expect(err).toBeInstanceOf(EIPError);
  });
});

describe('TimeoutError', () => {
  it('carries duration', () => {
    const err = new TimeoutError('Request timed out', 10000);
    expect(err.duration).toBe(10000);
    expect(err.name).toBe('TimeoutError');
    expect(err).toBeInstanceOf(EIPError);
  });
});

describe('CIPError', () => {
  it('resolves human-readable status message', () => {
    const err = new CIPError(0x05);
    expect(err.generalStatusCode).toBe(0x05);
    expect(err.statusMessage).toBe('Path destination unknown');
    expect(err.message).toContain('Path destination unknown');
    expect(err).toBeInstanceOf(EIPError);
  });

  it('carries extended status', () => {
    const err = new CIPError(0x1f, [0x1234]);
    expect(err.extendedStatus).toEqual([0x1234]);
  });

  it('handles unknown status code', () => {
    const err = new CIPError(0xff);
    expect(err.statusMessage).toContain('Unknown');
  });
});

describe('TagNotFoundError', () => {
  it('is instanceof CIPError with status 0x05', () => {
    const err = new TagNotFoundError('MyTag');
    expect(err).toBeInstanceOf(CIPError);
    expect(err).toBeInstanceOf(EIPError);
    expect(err.generalStatusCode).toBe(0x05);
    expect(err.context).toEqual({ tagName: 'MyTag' });
    expect(err.name).toBe('TagNotFoundError');
  });
});

describe('TypeMismatchError', () => {
  it('includes tag name and types in message', () => {
    const err = new TypeMismatchError('MyTag', 'DINT', 'string');
    expect(err.message).toContain('MyTag');
    expect(err.message).toContain('DINT');
    expect(err.message).toContain('string');
    expect(err.name).toBe('TypeMismatchError');
    expect(err).toBeInstanceOf(EIPError);
  });
});

describe('FragmentationError', () => {
  it('is instanceof EIPError', () => {
    const err = new FragmentationError('Transfer incomplete', { offset: 512 });
    expect(err.context).toEqual({ offset: 512 });
    expect(err.name).toBe('FragmentationError');
    expect(err).toBeInstanceOf(EIPError);
  });
});

describe('getStatusMessage', () => {
  it('returns message for known codes', () => {
    expect(getStatusMessage(0x00)).toBe('Success');
    expect(getStatusMessage(0x05)).toBe('Path destination unknown');
    expect(getStatusMessage(0x06)).toBe('Partial transfer');
    expect(getStatusMessage(0x08)).toBe('Service not supported');
  });

  it('returns unknown for unregistered codes', () => {
    expect(getStatusMessage(0xfe)).toContain('Unknown');
  });
});

describe('CIP_STATUS_CODES', () => {
  it('has entries for common codes', () => {
    expect(CIP_STATUS_CODES[0x00]).toBeDefined();
    expect(CIP_STATUS_CODES[0x01]).toBeDefined();
    expect(CIP_STATUS_CODES[0x05]).toBeDefined();
    expect(CIP_STATUS_CODES[0x06]).toBeDefined();
    expect(CIP_STATUS_CODES[0x08]).toBeDefined();
    expect(CIP_STATUS_CODES[0x14]).toBeDefined();
  });
});
