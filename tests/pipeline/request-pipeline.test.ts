import { RequestPipeline } from '@/pipeline/request-pipeline';
import { MockTransport } from '@/transport/mock-transport';
import { EIP_HEADER_SIZE } from '@/encapsulation/header';
import { TimeoutError } from '@/errors';

/** Build a minimal valid EIP packet with the given payload */
function buildEIPPacket(payload: Buffer = Buffer.alloc(0)): Buffer {
  const header = Buffer.alloc(EIP_HEADER_SIZE);
  // Write payload length at offset 2 (UINT16LE)
  header.writeUInt16LE(payload.length, 2);
  return Buffer.concat([header, payload]);
}

describe('RequestPipeline', () => {
  let transport: MockTransport;
  let pipeline: RequestPipeline;

  beforeEach(async () => {
    transport = new MockTransport();
    await transport.connect('127.0.0.1', 44818);
    pipeline = new RequestPipeline(transport);
  });

  it('sends request and resolves with response', async () => {
    const request = Buffer.from([0x01, 0x02]);
    const response = buildEIPPacket(Buffer.from([0xaa, 0xbb]));

    const promise = pipeline.send(request);

    // Pipeline should have written to transport
    expect(transport.sentData.length).toBe(1);
    expect(transport.sentData[0]).toEqual(request);

    // Inject response
    transport.injectResponse(response);

    const result = await promise;
    expect(result).toEqual(response);
  });

  it('serializes requests — second waits for first', async () => {
    const response1 = buildEIPPacket(Buffer.from([0x01]));
    const response2 = buildEIPPacket(Buffer.from([0x02]));

    const promise1 = pipeline.send(Buffer.from([0xaa]));
    const promise2 = pipeline.send(Buffer.from([0xbb]));

    // Only first request should be sent
    expect(transport.sentData.length).toBe(1);

    // Resolve first
    transport.injectResponse(response1);
    const result1 = await promise1;
    expect(result1).toEqual(response1);

    // Now second should be sent
    expect(transport.sentData.length).toBe(2);

    // Resolve second
    transport.injectResponse(response2);
    const result2 = await promise2;
    expect(result2).toEqual(response2);
  });

  it('rejects with TimeoutError when response is too slow', async () => {
    jest.useFakeTimers();

    const promise = pipeline.send(Buffer.from([0x01]), 500);

    // Advance past timeout
    jest.advanceTimersByTime(501);

    await expect(promise).rejects.toBeInstanceOf(TimeoutError);

    jest.useRealTimers();
  });

  it('processes next request after timeout', async () => {
    jest.useFakeTimers();

    const promise1 = pipeline.send(Buffer.from([0x01]), 100);
    const promise2 = pipeline.send(Buffer.from([0x02]), 5000);

    // Timeout first request
    jest.advanceTimersByTime(101);
    await expect(promise1).rejects.toBeInstanceOf(TimeoutError);

    // Second should now be in flight
    expect(transport.sentData.length).toBe(2);

    // Resolve second
    const response = buildEIPPacket(Buffer.from([0xcc]));
    transport.injectResponse(response);

    jest.advanceTimersByTime(0);
    const result = await promise2;
    expect(result).toEqual(response);

    jest.useRealTimers();
  });

  it('handles partial TCP reads', async () => {
    const payload = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    const fullPacket = buildEIPPacket(payload);

    const promise = pipeline.send(Buffer.from([0x01]));

    // Send first half
    transport.injectResponse(fullPacket.subarray(0, 14));
    // Send second half
    transport.injectResponse(fullPacket.subarray(14));

    const result = await promise;
    expect(result).toEqual(fullPacket);
  });

  it('handles multiple packets in one data event', async () => {
    const response1 = buildEIPPacket(Buffer.from([0x01]));
    const response2 = buildEIPPacket(Buffer.from([0x02]));

    const promise1 = pipeline.send(Buffer.from([0xaa]));
    const promise2 = pipeline.send(Buffer.from([0xbb]));

    // Send both responses concatenated
    transport.injectResponse(Buffer.concat([response1, response2]));

    const result1 = await promise1;
    const result2 = await promise2;
    expect(result1).toEqual(response1);
    expect(result2).toEqual(response2);
  });

  it('flush rejects all pending and queued requests', async () => {
    const promise1 = pipeline.send(Buffer.from([0x01]));
    const promise2 = pipeline.send(Buffer.from([0x02]));

    const err = new Error('disconnected');
    pipeline.flush(err);

    await expect(promise1).rejects.toBe(err);
    await expect(promise2).rejects.toBe(err);
  });
});
