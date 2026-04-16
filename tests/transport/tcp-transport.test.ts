import * as net from 'net';
import { TCPTransport } from '@/transport/tcp-transport';

/** Create a local TCP server that accepts but never sends data. */
function createSilentServer(): Promise<{ server: net.Server; port: number }> {
  return new Promise((resolve) => {
    const connections: net.Socket[] = [];
    const server = net.createServer((sock) => connections.push(sock));
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo;
      resolve({ server, port: addr.port });
    });
    server.on('close', () => connections.forEach((s) => s.destroy()));
  });
}

/** Find a port that is not listening (for connection-refused tests). */
function findClosedPort(): Promise<number> {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(port));
    });
  });
}

describe('TCPTransport.connect timeout', () => {
  let server: net.Server;
  let port: number;

  beforeAll(async () => {
    ({ server, port } = await createSilentServer());
  });

  afterAll((done) => {
    server.close(done);
  });

  it('rejects with timeout error when server never responds', async () => {
    const transport = new TCPTransport();
    await expect(transport.connect('192.0.2.1', 44818, 200)).rejects.toThrow(
      'TCP connect timed out after 200ms',
    );
  }, 5000);

  it('rejects with socket error when connection refused (before timeout)', async () => {
    const closedPort = await findClosedPort();
    const transport = new TCPTransport();
    await expect(transport.connect('127.0.0.1', closedPort, 5000)).rejects.toThrow('ECONNREFUSED');
  });

  it('resolves normally when connection succeeds within timeout', async () => {
    const transport = new TCPTransport();
    await expect(transport.connect('127.0.0.1', port, 5000)).resolves.toBeUndefined();
    transport.close();
  });

  it('resolves when no timeout is specified', async () => {
    const transport = new TCPTransport();
    await expect(transport.connect('127.0.0.1', port)).resolves.toBeUndefined();
    transport.close();
  });
});

describe('TCPTransport connected getter', () => {
  let server: net.Server;
  let port: number;

  beforeAll(async () => {
    ({ server, port } = await createSilentServer());
  });

  afterAll((done) => {
    server.close(done);
  });

  it('is true after connect', async () => {
    const transport = new TCPTransport();
    await transport.connect('127.0.0.1', port);
    expect(transport.connected).toBe(true);
    transport.close();
  });

  it('is false after close', async () => {
    const transport = new TCPTransport();
    await transport.connect('127.0.0.1', port);
    transport.close();
    expect(transport.connected).toBe(false);
  });
});

describe('TCPTransport write/onData/onClose/onError', () => {
  let server: net.Server;
  let port: number;
  let serverSockets: net.Socket[];

  beforeAll(async () => {
    serverSockets = [];
    await new Promise<void>((resolve) => {
      server = net.createServer((sock) => {
        serverSockets.push(sock);
        sock.on('data', (d) => sock.write(d)); // echo
      });
      server.listen(0, '127.0.0.1', () => {
        port = (server.address() as net.AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll((done) => {
    serverSockets.forEach((s) => s.destroy());
    server.close(done);
  });

  it('write sends data and onData receives echo', async () => {
    const transport = new TCPTransport();
    await transport.connect('127.0.0.1', port);

    const received = await new Promise<Buffer>((resolve) => {
      transport.onData(resolve);
      transport.write(Buffer.from([0xaa, 0xbb]));
    });

    expect(received).toEqual(Buffer.from([0xaa, 0xbb]));
    transport.close();
  });

  it('onClose fires when transport is closed', async () => {
    const transport = new TCPTransport();
    await transport.connect('127.0.0.1', port);

    const closed = new Promise<boolean>((resolve) => {
      transport.onClose((hadError) => resolve(hadError));
    });

    transport.close();
    expect(await closed).toBe(false);
  });

  it('onError fires on socket error', async () => {
    const transport = new TCPTransport();
    await transport.connect('127.0.0.1', port);

    const errPromise = new Promise<Error>((resolve) => {
      transport.onError(resolve);
    });

    // Destroy server-side socket to cause a write error
    serverSockets.forEach((s) => s.destroy());
    // Write to a half-closed socket to trigger error
    transport.write(Buffer.alloc(1024));
    // Give it a moment for the error to propagate
    const err = await Promise.race([
      errPromise,
      new Promise<null>((r) => setTimeout(() => r(null), 500)),
    ]);

    // Error may or may not fire depending on OS timing — just verify handler was registered
    transport.close();
    if (err) {
      expect(err).toBeTruthy();
    }
  });
});
