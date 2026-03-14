import { MockTransport } from '@/transport/mock-transport';

describe('MockTransport', () => {
  let transport: MockTransport;

  beforeEach(() => {
    transport = new MockTransport();
  });

  it('should start disconnected', () => {
    expect(transport.connected).toBe(false);
  });

  it('should connect successfully', async () => {
    await transport.connect('127.0.0.1', 44818);
    expect(transport.connected).toBe(true);
  });

  it('should record written data', () => {
    const buf1 = Buffer.from([0x01, 0x02]);
    const buf2 = Buffer.from([0x03, 0x04]);
    transport.write(buf1);
    transport.write(buf2);
    expect(transport.sentData).toEqual([buf1, buf2]);
  });

  it('should trigger onData handler when response injected', () => {
    const handler = jest.fn();
    transport.onData(handler);
    const response = Buffer.from([0xaa, 0xbb]);
    transport.injectResponse(response);
    expect(handler).toHaveBeenCalledWith(response);
  });

  it('should trigger onClose handler', () => {
    const handler = jest.fn();
    transport.onClose(handler);
    transport.triggerClose(true);
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('should trigger onError handler', () => {
    const handler = jest.fn();
    transport.onError(handler);
    const err = new Error('connection lost');
    transport.triggerError(err);
    expect(handler).toHaveBeenCalledWith(err);
  });

  it('should clear sentData on reset', () => {
    transport.write(Buffer.from([0x01]));
    transport.reset();
    expect(transport.sentData).toEqual([]);
  });

  it('should not throw when injecting response with no handler', () => {
    expect(() => transport.injectResponse(Buffer.from([0x01]))).not.toThrow();
  });

  it('should not throw when triggering close with no handler', () => {
    expect(() => transport.triggerClose()).not.toThrow();
  });

  it('should not throw when triggering error with no handler', () => {
    expect(() => transport.triggerError(new Error('test'))).not.toThrow();
  });

  it('should set connected=false on close', async () => {
    await transport.connect('127.0.0.1', 44818);
    expect(transport.connected).toBe(true);
    transport.close();
    expect(transport.connected).toBe(false);
  });
});
