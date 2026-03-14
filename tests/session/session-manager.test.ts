import { SessionManager, ConnectionState } from '@/session';
import { MockTransport } from '@/transport/mock-transport';
import { EIPCommand } from '@/encapsulation/commands';
import { ConnectionError } from '@/errors';

/**
 * Build a mock RegisterSession response.
 */
function buildRegisterSessionResponse(sessionId: number): Buffer {
  const data = Buffer.alloc(4);
  data.writeUInt16LE(0x01, 0); // protocol version
  const header = Buffer.alloc(24);
  header.writeUInt16LE(EIPCommand.RegisterSession, 0);
  header.writeUInt16LE(data.length, 2);
  header.writeUInt32LE(sessionId, 4);
  return Buffer.concat([header, data]);
}

/**
 * Build a mock SendRRData response wrapping a CIP success reply.
 */
function buildForwardOpenResponse(sessionId: number): Buffer {
  // CIP reply: service|0x80, reserved, status=0, extLen=0, OT connId(4)
  const cipReply = Buffer.alloc(8);
  cipReply.writeUInt8(0x54 | 0x80, 0);
  cipReply.writeUInt8(0x00, 2); // success
  cipReply.writeUInt32LE(0x12345678, 4);

  // CPF: Null item + UCMM item
  const nullItem = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const ucmmHeader = Buffer.alloc(4);
  ucmmHeader.writeUInt16LE(0x00b2, 0);
  ucmmHeader.writeUInt16LE(cipReply.length, 2);

  // Interface Handle(4) + Timeout(2) + ItemCount(2) + items
  const prefix = Buffer.alloc(8);
  prefix.writeUInt16LE(2, 6); // item count
  const fullPayload = Buffer.concat([prefix, nullItem, ucmmHeader, cipReply]);

  const header = Buffer.alloc(24);
  header.writeUInt16LE(EIPCommand.SendRRData, 0);
  header.writeUInt16LE(fullPayload.length, 2);
  header.writeUInt32LE(sessionId, 4);
  return Buffer.concat([header, fullPayload]);
}

/**
 * Auto-respond to pipeline requests via transport.
 * Queues responses that get injected on next tick after each write.
 */
function autoRespond(transport: MockTransport, responses: Buffer[]): void {
  let idx = 0;
  const origWrite = transport.write.bind(transport);
  transport.write = (data: Buffer) => {
    origWrite(data);
    if (idx < responses.length) {
      const resp = responses[idx++];
      // Defer to next tick so pipeline's onData handler is registered
      setImmediate(() => transport.injectResponse(resp));
    }
  };
}

describe('SessionManager', () => {
  let transport: MockTransport;
  let session: SessionManager;

  beforeEach(() => {
    transport = new MockTransport();
    session = new SessionManager(transport);
  });

  it('starts in Disconnected state', () => {
    expect(session.state).toBe(ConnectionState.Disconnected);
  });

  it('emits state events during connect', async () => {
    const states: string[] = [];
    session.on('connecting', () => states.push('connecting'));
    session.on('registering', () => states.push('registering'));
    session.on('forward-opening', () => states.push('forward-opening'));
    session.on('connected', () => states.push('connected'));

    autoRespond(transport, [buildRegisterSessionResponse(0x42), buildForwardOpenResponse(0x42)]);

    await session.connect('192.168.1.1');

    expect(states).toEqual(['connecting', 'registering', 'forward-opening', 'connected']);
    expect(session.state).toBe(ConnectionState.Connected);
    expect(session.sessionId).toBe(0x42);
    expect(session.connectionSize).toBeGreaterThan(0);
  });

  it('has a pipeline after connect', async () => {
    autoRespond(transport, [buildRegisterSessionResponse(0x01), buildForwardOpenResponse(0x01)]);

    await session.connect('192.168.1.1');
    expect(session.pipeline).not.toBeNull();
  });

  it('transitions to Disconnected on disconnect', async () => {
    autoRespond(transport, [
      buildRegisterSessionResponse(0x01),
      buildForwardOpenResponse(0x01),
      buildForwardOpenResponse(0x01), // Response to Forward Close (same shape, just needs success)
    ]);

    await session.connect('192.168.1.1');
    await session.disconnect();

    expect(session.state).toBe(ConnectionState.Disconnected);
    expect(session.sessionId).toBe(0);
    expect(session.pipeline).toBeNull();
  });
});

// Additional coverage tests in a separate describe block
describe('SessionManager error paths', () => {
  let transport: MockTransport;
  let session: SessionManager;

  beforeEach(() => {
    transport = new MockTransport();
    session = new SessionManager(transport);
  });

  it('throws ConnectionError when TCP connect fails', async () => {
    transport.connect = () => Promise.reject(new Error('ECONNREFUSED'));

    await expect(session.connect('192.168.1.1')).rejects.toBeInstanceOf(ConnectionError);
    expect(session.state).toBe(ConnectionState.Disconnected);
  });

  it('transitions to Disconnected on transport close', async () => {
    autoRespond(transport, [buildRegisterSessionResponse(0x01), buildForwardOpenResponse(0x01)]);
    await session.connect('192.168.1.1');

    const disconnectedPromise = new Promise<void>((resolve) => {
      session.on('disconnected', resolve);
    });

    transport.triggerClose();
    await disconnectedPromise;

    expect(session.state).toBe(ConnectionState.Disconnected);
  });

  it('emits error event on transport error', async () => {
    autoRespond(transport, [buildRegisterSessionResponse(0x01), buildForwardOpenResponse(0x01)]);
    await session.connect('192.168.1.1');

    const errorPromise = new Promise<Error>((resolve) => {
      session.on('error', resolve);
    });

    transport.triggerError(new Error('socket error'));
    const emitted = await errorPromise;
    expect(emitted.message).toBe('socket error');
  });
});
