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

  it('cleans up previous session when connect() called again', async () => {
    autoRespond(transport, [buildRegisterSessionResponse(0x01), buildForwardOpenResponse(0x01)]);
    await session.connect('192.168.1.1');
    expect(session.state).toBe(ConnectionState.Connected);

    // Second connect on same instance — should not throw
    const transport2 = new MockTransport();
    const session2 = new SessionManager(transport2);
    autoRespond(transport2, [buildRegisterSessionResponse(0x02), buildForwardOpenResponse(0x02)]);
    await session2.connect('192.168.1.1');

    // Simulate: first session still in Connected state, call connect again
    autoRespond(transport, [buildRegisterSessionResponse(0x03), buildForwardOpenResponse(0x03)]);
    await session.connect('192.168.1.1');
    expect(session.state).toBe(ConnectionState.Connected);
  });

  it('cancels reconnect timer when connect() called', async () => {
    autoRespond(transport, [buildRegisterSessionResponse(0x01), buildForwardOpenResponse(0x01)]);
    await session.connect('192.168.1.1', {
      reconnect: { enabled: true, initialDelay: 100, maxDelay: 100, multiplier: 1, maxRetries: 5 },
    });

    transport.triggerClose();
    await new Promise((r) => setTimeout(r, 10));
    expect(session.state).toBe(ConnectionState.Reconnecting);

    // External connect() should cancel the reconnector
    autoRespond(transport, [buildRegisterSessionResponse(0x02), buildForwardOpenResponse(0x02)]);
    await session.connect('192.168.1.1');
    expect(session.state).toBe(ConnectionState.Connected);
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

describe('SessionManager connected option', () => {
  let transport: MockTransport;
  let session: SessionManager;

  beforeEach(() => {
    transport = new MockTransport();
    session = new SessionManager(transport);
  });

  it('skips Forward Open when connected=false', async () => {
    const states: string[] = [];
    session.on('connecting', () => states.push('connecting'));
    session.on('registering', () => states.push('registering'));
    session.on('forward-opening', () => states.push('forward-opening'));
    session.on('connected', () => states.push('connected'));

    autoRespond(transport, [buildRegisterSessionResponse(0x42)]);

    await session.connect('192.168.1.1', { connected: false });

    expect(states).toEqual(['connecting', 'registering', 'connected']);
    expect(session.connectionId).toBe(0);
    expect(session.connectionSize).toBe(0);
  });

  it('stores connectionId from Forward Open response', async () => {
    autoRespond(transport, [buildRegisterSessionResponse(0x01), buildForwardOpenResponse(0x01)]);
    await session.connect('192.168.1.1');

    // buildForwardOpenResponse writes 0x12345678 at offset 4 of CIP reply
    expect(session.connectionId).toBe(0x12345678);
  });

  it('increments sequence counter', async () => {
    autoRespond(transport, [buildRegisterSessionResponse(0x01), buildForwardOpenResponse(0x01)]);
    await session.connect('192.168.1.1');

    expect(session.nextSequence()).toBe(0);
    expect(session.nextSequence()).toBe(1);
    expect(session.nextSequence()).toBe(2);
  });

  it('wraps sequence counter at 16 bits', async () => {
    autoRespond(transport, [buildRegisterSessionResponse(0x01), buildForwardOpenResponse(0x01)]);
    await session.connect('192.168.1.1');

    // Force counter near overflow
    for (let i = 0; i < 0xffff; i++) session.nextSequence();
    expect(session.nextSequence()).toBe(0xffff);
    expect(session.nextSequence()).toBe(0); // wraps
  });

  it('cleans up on Forward Open failure', async () => {
    // Only provide RegisterSession response — Forward Open will timeout/fail
    const failCipReply = Buffer.alloc(8);
    failCipReply.writeUInt8(0x54 | 0x80, 0);
    failCipReply.writeUInt8(0x01, 2); // non-zero status = failure

    const nullItem = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const ucmmHeader = Buffer.alloc(4);
    ucmmHeader.writeUInt16LE(0x00b2, 0);
    ucmmHeader.writeUInt16LE(failCipReply.length, 2);
    const prefix = Buffer.alloc(8);
    prefix.writeUInt16LE(2, 6);
    const fullPayload = Buffer.concat([prefix, nullItem, ucmmHeader, failCipReply]);
    const header = Buffer.alloc(24);
    header.writeUInt16LE(EIPCommand.SendRRData, 0);
    header.writeUInt16LE(fullPayload.length, 2);
    header.writeUInt32LE(0x01, 4);
    const failResponse = Buffer.concat([header, fullPayload]);

    autoRespond(transport, [
      buildRegisterSessionResponse(0x01),
      failResponse, // Large Forward Open fails
      failResponse, // Small Forward Open fails
    ]);

    await expect(session.connect('192.168.1.1')).rejects.toThrow('Forward Open failed');
    expect(session.state).toBe(ConnectionState.Disconnected);
    expect(session.sessionId).toBe(0);
    expect(session.pipeline).toBeNull();
  });
});

describe('SessionManager passes timeoutMs to transport', () => {
  it('calls transport.connect with the configured timeout', async () => {
    const transport = new MockTransport();
    const connectSpy = jest.spyOn(transport, 'connect');
    const session = new SessionManager(transport);

    autoRespond(transport, [buildRegisterSessionResponse(0x01), buildForwardOpenResponse(0x01)]);
    await session.connect('192.168.1.1', { timeoutMs: 3000 });

    expect(connectSpy).toHaveBeenCalledWith('192.168.1.1', 44818, 3000);
  });

  it('uses default timeout when not specified', async () => {
    const transport = new MockTransport();
    const connectSpy = jest.spyOn(transport, 'connect');
    const session = new SessionManager(transport);

    autoRespond(transport, [buildRegisterSessionResponse(0x01), buildForwardOpenResponse(0x01)]);
    await session.connect('192.168.1.1');

    expect(connectSpy).toHaveBeenCalledWith('192.168.1.1', 44818, 10000);
  });
});

describe('SessionManager reconnect on close', () => {
  it('enters Reconnecting state when autoReconnect enabled', async () => {
    const transport = new MockTransport();
    const session = new SessionManager(transport);
    const states: string[] = [];

    session.on('connected', () => states.push('connected'));
    session.on('reconnecting', () => states.push('reconnecting'));

    autoRespond(transport, [buildRegisterSessionResponse(0x01), buildForwardOpenResponse(0x01)]);
    await session.connect('192.168.1.1', {
      reconnect: { enabled: true, initialDelay: 100, maxDelay: 100, multiplier: 1, maxRetries: 1 },
    });

    expect(states).toContain('connected');

    // Trigger close — should enter reconnecting
    transport.triggerClose();

    // Give reconnector time to schedule
    await new Promise((r) => setTimeout(r, 50));
    expect(session.state).toBe(ConnectionState.Reconnecting);

    // Cancel pending reconnect timer to avoid leaking handles
    await session.disconnect();
  });

  it('resets connectionId and sequenceCount on close', async () => {
    const transport = new MockTransport();
    const session = new SessionManager(transport);

    autoRespond(transport, [buildRegisterSessionResponse(0x01), buildForwardOpenResponse(0x01)]);
    await session.connect('192.168.1.1');

    session.nextSequence();
    session.nextSequence();
    expect(session.connectionId).not.toBe(0);

    transport.triggerClose();
    await new Promise((r) => setTimeout(r, 10));

    expect(session.connectionId).toBe(0);
    expect(session.connectionSize).toBe(0);
  });

  it('falls back to Disconnected when maxRetries is 0', async () => {
    const transport = new MockTransport();
    const session = new SessionManager(transport);

    autoRespond(transport, [buildRegisterSessionResponse(0x01), buildForwardOpenResponse(0x01)]);
    await session.connect('192.168.1.1', {
      reconnect: { enabled: true, initialDelay: 100, maxDelay: 100, multiplier: 1, maxRetries: 0 },
    });

    transport.triggerClose();
    await new Promise((r) => setTimeout(r, 10));

    expect(session.state).toBe(ConnectionState.Disconnected);
  });

  it('emits disconnected after error when transport is dead', async () => {
    const transport = new MockTransport();
    const session = new SessionManager(transport);

    autoRespond(transport, [buildRegisterSessionResponse(0x01), buildForwardOpenResponse(0x01)]);
    await session.connect('192.168.1.1');

    const events: string[] = [];
    session.on('error', () => events.push('error'));
    session.on('disconnected', () => events.push('disconnected'));

    // Simulate ECONNRESET: transport dies, then error fires
    transport.connected = false;
    transport.triggerError(new Error('read ECONNRESET'));

    await new Promise((r) => setTimeout(r, 10));
    expect(events).toEqual(['error', 'disconnected']);
  });

  it('does not double-emit disconnected when both error and close fire', async () => {
    const transport = new MockTransport();
    const session = new SessionManager(transport);

    autoRespond(transport, [buildRegisterSessionResponse(0x01), buildForwardOpenResponse(0x01)]);
    await session.connect('192.168.1.1');

    let disconnectCount = 0;
    session.on('error', () => {}); // prevent unhandled error throw
    session.on('disconnected', () => disconnectCount++);

    transport.connected = false;
    transport.triggerError(new Error('read ECONNRESET'));
    transport.triggerClose();

    await new Promise((r) => setTimeout(r, 10));
    expect(disconnectCount).toBe(1);
  });
});
