import { buildBatches, BatchRequest, parseMultiServiceResponse } from '@/cip/batch-builder';

function makeRequest(serviceSize: number, responseSize: number): BatchRequest {
  return {
    serviceData: Buffer.alloc(serviceSize, 0xaa),
    estimatedResponseSize: responseSize,
  };
}

describe('buildBatches', () => {
  it('returns empty array for no requests', () => {
    expect(buildBatches([], 504)).toEqual([]);
  });

  it('returns single request unwrapped (no multi-service overhead)', () => {
    const req = makeRequest(20, 10);
    const batches = buildBatches([req], 504);

    expect(batches.length).toBe(1);
    expect(batches[0].data).toEqual(req.serviceData);
  });

  it('packs multiple small requests into one batch', () => {
    const requests = [makeRequest(20, 10), makeRequest(20, 10), makeRequest(20, 10)];
    const batches = buildBatches(requests, 504);

    expect(batches.length).toBe(1);
    expect(batches[0].requests.length).toBe(3);
  });

  it('splits when request size exceeds connection size', () => {
    // Each service is 200 bytes. With overhead, 2 fit in 504 but 3 don't.
    const requests = [makeRequest(200, 10), makeRequest(200, 10), makeRequest(200, 10)];
    const batches = buildBatches(requests, 504);

    expect(batches.length).toBe(2);
  });

  it('produces no leftover batch when requests divide evenly', () => {
    // Two requests that exactly fill one batch, then two more that fill another
    // Use a tiny connectionSize to force splits
    const requests = [
      makeRequest(100, 10),
      makeRequest(100, 10),
      makeRequest(100, 10),
      makeRequest(100, 10),
    ];
    const batches = buildBatches(requests, 220);

    // Each batch can hold ~1 request at size 220 (base 2 + per-service 2 + 100 = 104 per)
    // Two fit: 2 + 2*2 + 2*100 = 206 < 220. Three: 2 + 3*2 + 3*100 = 308 > 220.
    // So 2 batches of 2 each — no leftover
    expect(batches.length).toBe(2);
    expect(batches[0].requests.length).toBe(2);
    expect(batches[1].requests.length).toBe(2);
  });

  it('splits when response size exceeds connection size', () => {
    // Small requests but large estimated responses
    const requests = [makeRequest(10, 200), makeRequest(10, 200), makeRequest(10, 200)];
    const batches = buildBatches(requests, 504);

    // Response: base(2) + 3*(6+200) = 620 > 504, so should split
    expect(batches.length).toBe(2);
  });

  it('handles large connection size (4002) efficiently', () => {
    // 50 small requests should fit in one batch at 4002
    const requests = Array.from({ length: 50 }, () => makeRequest(20, 10));
    const batches = buildBatches(requests, 4002);

    expect(batches.length).toBe(1);
    expect(batches[0].requests.length).toBe(50);
  });

  it('batch data starts with Multiple Service Packet service code', () => {
    const requests = [makeRequest(10, 10), makeRequest(10, 10)];
    const batches = buildBatches(requests, 504);

    // First byte of the Message Router wrapper should be 0x0A
    expect(batches[0].data.readUInt8(0)).toBe(0x0a);
  });

  it('batch data contains correct service count', () => {
    const requests = [makeRequest(10, 10), makeRequest(10, 10), makeRequest(10, 10)];
    const batches = buildBatches(requests, 4002);

    // After MR header (service + pathSize + path), the payload starts
    // MR path = Class 0x02 Instance 0x01 = 4 bytes, so payload at offset 6
    const payloadOffset = 2 + 4; // 2 (service+pathSize) + 4 (path)
    const serviceCount = batches[0].data.readUInt16LE(payloadOffset);
    expect(serviceCount).toBe(3);
  });

  it('seals all requests into splits with nothing left over', () => {
    // Each request alone fills a batch — the final currentRequests should be empty
    // after the loop, so the trailing if(currentRequests.length > 0) is false
    const requests = [makeRequest(500, 10), makeRequest(500, 10)];
    const batches = buildBatches(requests, 504);

    // base(2) + per(2) + 500 = 504 — exactly 1 per batch
    // Second request triggers split, gets sealed, nothing left
    expect(batches.length).toBe(2);
  });
});

describe('parseMultiServiceResponse', () => {
  it('parses a response with two replies', () => {
    // Reply 0: service=0xCC, reserved=0, status=0, extLen=0, data=[C4 00 2A 00 00 00]
    const reply0 = Buffer.from([0xcc, 0x00, 0x00, 0x00, 0xc4, 0x00, 0x2a, 0x00, 0x00, 0x00]);
    // Reply 1: service=0xCC, reserved=0, status=0, extLen=0, data=[C1 00 FF]
    const reply1 = Buffer.from([0xcc, 0x00, 0x00, 0x00, 0xc1, 0x00, 0xff]);

    // count(2) + offset0(2) + offset1(2) + reply0 + reply1
    const headerSize = 2 + 2 * 2; // count + 2 offsets
    const buf = Buffer.alloc(headerSize + reply0.length + reply1.length);
    buf.writeUInt16LE(2, 0); // count
    buf.writeUInt16LE(headerSize, 2); // offset to reply0
    buf.writeUInt16LE(headerSize + reply0.length, 4); // offset to reply1
    reply0.copy(buf, headerSize);
    reply1.copy(buf, headerSize + reply0.length);

    const replies = parseMultiServiceResponse(buf);
    expect(replies).toHaveLength(2);
    expect(replies[0].generalStatusCode).toBe(0);
    expect(replies[0].data.readUInt16LE(0)).toBe(0x00c4); // DINT type
    expect(replies[1].generalStatusCode).toBe(0);
    expect(replies[1].data.readUInt8(2)).toBe(0xff); // BOOL true
  });

  it('parses a single reply', () => {
    const reply = Buffer.from([0xcc, 0x00, 0x00, 0x00, 0xc3, 0x00, 0x07, 0x00]);
    const buf = Buffer.alloc(4 + reply.length);
    buf.writeUInt16LE(1, 0);
    buf.writeUInt16LE(4, 2); // offset
    reply.copy(buf, 4);

    const replies = parseMultiServiceResponse(buf);
    expect(replies).toHaveLength(1);
    expect(replies[0].generalStatusCode).toBe(0);
  });

  it('handles reply with non-zero status', () => {
    const reply = Buffer.from([0xcc, 0x00, 0x05, 0x00]); // status 0x05 = path unknown
    const buf = Buffer.alloc(4 + reply.length);
    buf.writeUInt16LE(1, 0);
    buf.writeUInt16LE(4, 2);
    reply.copy(buf, 4);

    const replies = parseMultiServiceResponse(buf);
    expect(replies[0].generalStatusCode).toBe(0x05);
  });
});
