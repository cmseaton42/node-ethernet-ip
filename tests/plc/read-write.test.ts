import { buildReadRequest, parseReadResponse, isStructTypeParam } from '@/plc/read';
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

describe('isStructTypeParam', () => {
  it('returns true for struct marker A0 02', () => {
    expect(isStructTypeParam(Buffer.from([0xa0, 0x02, 0x00, 0x00]))).toBe(true);
  });

  it('returns false for atomic type codes', () => {
    const buf = Buffer.alloc(2);
    buf.writeUInt16LE(CIPDataType.DINT, 0);
    expect(isStructTypeParam(buf)).toBe(false);
  });
});

describe('parseReadResponse', () => {
  it('parses DINT value', () => {
    const codec = getCodec(CIPDataType.DINT);
    const encoded = codec.encode(42);
    const data = Buffer.alloc(2 + encoded.length);
    data.writeUInt16LE(CIPDataType.DINT, 0);
    encoded.copy(data, 2);

    const { type, isStruct, value } = parseReadResponse(data, 'MyDINT');
    expect(type).toBe(CIPDataType.DINT);
    expect(isStruct).toBe(false);
    expect(value).toBe(42);
  });

  it('parses BOOL value', () => {
    const data = Buffer.alloc(3);
    data.writeUInt16LE(CIPDataType.BOOL, 0);
    data.writeUInt8(1, 2);

    const { value, isStruct } = parseReadResponse(data, 'MyBool');
    expect(value).toBe(true);
    expect(isStruct).toBe(false);
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

  it('parses struct response with correct 4-byte type param', () => {
    // Wire format per Rockwell manual: A0 02 <handle_lo> <handle_hi> <data...>
    const structHandle = 0x9ecd;
    const structData = Buffer.from([0x01, 0x00, 0x00, 0x00]); // example struct payload
    const data = Buffer.alloc(4 + structData.length);
    data.writeUInt8(0xa0, 0); // struct marker byte 0
    data.writeUInt8(0x02, 1); // struct marker byte 1
    data.writeUInt16LE(structHandle, 2); // struct handle
    structData.copy(data, 4);

    const { type, isStruct, value } = parseReadResponse(data, 'MyStruct');
    expect(isStruct).toBe(true);
    expect(type).toBe(structHandle);
    expect(Buffer.isBuffer(value)).toBe(true);
    // Value should NOT include the handle bytes — only the struct payload
    expect((value as Buffer).length).toBe(structData.length);
    expect((value as Buffer).equals(structData)).toBe(true);
  });
});

describe('buildWriteRequest', () => {
  it('starts with WRITE_TAG service code', () => {
    const buf = buildWriteRequest('MyTag', 42, CIPDataType.DINT);
    expect(buf[0]).toBe(CIPService.WRITE_TAG);
  });

  it('writes 4-byte struct type param when structHandle provided', () => {
    const structHandle = 0x9ecd;
    const rawData = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    const buf = buildWriteRequest('MyStruct', rawData, 0, 1, structHandle);
    expect(buf[0]).toBe(CIPService.WRITE_TAG);
    // After service(1) + pathSize(1) + path(N), find the data section
    const pathWords = buf[1];
    const dataStart = 2 + pathWords * 2;
    expect(buf[dataStart]).toBe(0xa0); // struct marker byte 0
    expect(buf[dataStart + 1]).toBe(0x02); // struct marker byte 1
    expect(buf.readUInt16LE(dataStart + 2)).toBe(structHandle);
    expect(buf.readUInt16LE(dataStart + 4)).toBe(1); // count
    expect(buf.subarray(dataStart + 6, dataStart + 10).equals(rawData)).toBe(true);
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
