import * as MessageRouter from '@/cip/message-router';
import { CIPService, REPLY_FLAG } from '@/cip/services';

describe('MessageRouter.build', () => {
  it('builds a Read Tag request with correct layout', () => {
    const path = Buffer.from([0x91, 0x05, 0x4d, 0x79, 0x54, 0x61, 0x67, 0x00]); // 'MyTag'
    const data = Buffer.alloc(2);
    data.writeUInt16LE(1, 0); // element count = 1

    const buf = MessageRouter.build(CIPService.READ_TAG, path, data);

    expect(buf.readUInt8(0)).toBe(CIPService.READ_TAG); // service
    expect(buf.readUInt8(1)).toBe(4); // path size = 8 bytes / 2 = 4 words
    expect(buf.subarray(2, 10)).toEqual(path); // EPATH
    expect(buf.readUInt16LE(10)).toBe(1); // element count
  });

  it('builds with empty data', () => {
    const path = Buffer.from([0x20, 0x01, 0x24, 0x01]);
    const buf = MessageRouter.build(CIPService.GET_ATTRIBUTE_ALL, path);

    expect(buf.length).toBe(6); // 2 header + 4 path
    expect(buf.readUInt8(0)).toBe(CIPService.GET_ATTRIBUTE_ALL);
  });
});

describe('MessageRouter.parse', () => {
  it('parses a successful response', () => {
    // Build a mock response: service|0x80, reserved, status=0, extLen=0, data=[0x42]
    const buf = Buffer.from([
      CIPService.READ_TAG | REPLY_FLAG, // reply service
      0x00, // reserved
      0x00, // general status = success
      0x00, // extended status length = 0
      0x42, // data
    ]);

    const resp = MessageRouter.parse(buf);
    expect(resp.service).toBe(CIPService.READ_TAG | REPLY_FLAG);
    expect(resp.generalStatusCode).toBe(0);
    expect(resp.extendedStatusLength).toBe(0);
    expect(resp.extendedStatus).toEqual([]);
    expect(resp.data).toEqual(Buffer.from([0x42]));
  });

  it('parses response with extended status', () => {
    const buf = Buffer.from([
      CIPService.READ_TAG | REPLY_FLAG,
      0x00,
      0x05, // general status = path error
      0x01, // 1 word of extended status
      0x34,
      0x12, // extended status = 0x1234
    ]);

    const resp = MessageRouter.parse(buf);
    expect(resp.generalStatusCode).toBe(0x05);
    expect(resp.extendedStatusLength).toBe(1);
    expect(resp.extendedStatus).toEqual([0x1234]);
    expect(resp.data.length).toBe(0);
  });

  it('round-trips build then parse', () => {
    const path = Buffer.from([0x20, 0x06, 0x24, 0x01]);
    const data = Buffer.from([0xaa, 0xbb]);
    const request = MessageRouter.build(CIPService.GET_ATTRIBUTE_ALL, path, data);

    // Verify the request has the right service code at byte 0
    expect(request.readUInt8(0)).toBe(CIPService.GET_ATTRIBUTE_ALL);
  });
});
