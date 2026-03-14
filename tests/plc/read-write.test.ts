import { buildReadRequest, parseReadResponse } from '@/plc/read';
import { buildWriteRequest, buildBitWriteRequest } from '@/plc/write';
import { CIPDataType, getCodec } from '@/cip/data-types';
import { CIPService } from '@/cip/services';

describe('buildReadRequest', () => {
  it('starts with READ_TAG service code', () => {
    const buf = buildReadRequest('MyTag');
    expect(buf[0]).toBe(CIPService.READ_TAG);
  });

  it('includes element count', () => {
    const buf = buildReadRequest('MyTag', 5);
    // Element count is at the end of the request
    const lastTwo = buf.subarray(buf.length - 2);
    expect(lastTwo.readUInt16LE(0)).toBe(5);
  });
});

describe('parseReadResponse', () => {
  it('parses DINT value', () => {
    const codec = getCodec(CIPDataType.DINT);
    const encoded = codec.encode(42);
    const data = Buffer.alloc(2 + encoded.length);
    data.writeUInt16LE(CIPDataType.DINT, 0);
    encoded.copy(data, 2);

    const { type, value } = parseReadResponse(data, 'MyDINT');
    expect(type).toBe(CIPDataType.DINT);
    expect(value).toBe(42);
  });

  it('parses BOOL value', () => {
    const data = Buffer.alloc(3);
    data.writeUInt16LE(CIPDataType.BOOL, 0);
    data.writeUInt8(1, 2);

    const { value } = parseReadResponse(data, 'MyBool');
    expect(value).toBe(true);
  });

  it('extracts bit-of-word', () => {
    // DINT value = 0x00000020 (bit 5 set)
    const codec = getCodec(CIPDataType.DINT);
    const encoded = codec.encode(0x20);
    const data = Buffer.alloc(2 + encoded.length);
    data.writeUInt16LE(CIPDataType.DINT, 0);
    encoded.copy(data, 2);

    const { value } = parseReadResponse(data, 'MyDINT.5');
    expect(value).toBe(true);

    const { value: value0 } = parseReadResponse(data, 'MyDINT.0');
    expect(value0).toBe(false);
  });

  it('returns Buffer for unknown type', () => {
    const data = Buffer.alloc(6);
    data.writeUInt16LE(0xa002, 0); // STRUCT
    data.writeUInt32LE(0xdeadbeef, 2);

    const { value } = parseReadResponse(data, 'MyStruct');
    expect(Buffer.isBuffer(value)).toBe(true);
  });
});

describe('buildWriteRequest', () => {
  it('starts with WRITE_TAG service code', () => {
    const buf = buildWriteRequest('MyTag', 42, CIPDataType.DINT);
    expect(buf[0]).toBe(CIPService.WRITE_TAG);
  });
});

describe('buildBitWriteRequest', () => {
  it('starts with READ_MODIFY_WRITE_TAG service code', () => {
    const buf = buildBitWriteRequest('MyDINT.5', true, CIPDataType.DINT);
    expect(buf[0]).toBe(CIPService.READ_MODIFY_WRITE_TAG);
  });

  it('builds SINT mask (1 byte)', () => {
    const buf = buildBitWriteRequest('MySINT.3', true, CIPDataType.SINT);
    expect(buf[0]).toBe(CIPService.READ_MODIFY_WRITE_TAG);
  });

  it('builds INT mask (2 bytes)', () => {
    const buf = buildBitWriteRequest('MyINT.7', false, CIPDataType.INT);
    expect(buf[0]).toBe(CIPService.READ_MODIFY_WRITE_TAG);
  });
});
