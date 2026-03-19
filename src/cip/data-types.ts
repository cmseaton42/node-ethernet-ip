/** CIP data type codes per CIP specification Volume 1 */
export enum CIPDataType {
  BOOL = 0xc1,
  SINT = 0xc2,
  INT = 0xc3,
  DINT = 0xc4,
  LINT = 0xc5,
  USINT = 0xc6,
  UINT = 0xc7,
  UDINT = 0xc8,
  REAL = 0xca,
  LREAL = 0xcb,
  STRING = 0xd0,
  SHORT_STRING = 0xda,
  BIT_STRING = 0xd3,
  WORD = 0xd1,
  DWORD = 0xd2,
  LWORD = 0xd4,
  STRUCT = 0xa002,
}

export interface DataCodec {
  size: number;
  encode(value: unknown): Buffer;
  decode(buf: Buffer, offset: number): unknown;
}

/** STRING fixed size: 4-byte DINT length prefix + 82 chars max + 2 zero padding = 88 bytes */
const STRING_TOTAL_SIZE = 88;

/** Rockwell built-in STRING struct handle (CRC). Used in Tag Type Service Parameter on the wire. */
export const STRING_STRUCT_HANDLE = 0x0fce;
const STRING_LENGTH_PREFIX_SIZE = 4;
const STRING_MAX_CHARS = 82;

export const CODEC_REGISTRY: ReadonlyMap<CIPDataType, DataCodec> = new Map<CIPDataType, DataCodec>([
  [
    CIPDataType.BOOL,
    {
      size: 1,
      // encode: write 0x01 for truthy, 0x00 for falsy
      encode: (v) => {
        const buf = Buffer.alloc(1);
        buf.writeUInt8(v ? 1 : 0, 0);
        return buf;
      },
      // decode: read single byte, nonzero → true
      decode: (buf, off) => buf.readUInt8(off) !== 0,
    },
  ],
  [
    CIPDataType.SINT,
    {
      size: 1,
      // encode: signed 8-bit integer
      encode: (v) => {
        const buf = Buffer.alloc(1);
        buf.writeInt8(v as number, 0);
        return buf;
      },
      // decode: signed 8-bit integer
      decode: (buf, off) => buf.readInt8(off),
    },
  ],
  [
    CIPDataType.INT,
    {
      size: 2,
      // encode: signed 16-bit little-endian
      encode: (v) => {
        const buf = Buffer.alloc(2);
        buf.writeInt16LE(v as number, 0);
        return buf;
      },
      // decode: signed 16-bit little-endian
      decode: (buf, off) => buf.readInt16LE(off),
    },
  ],
  [
    CIPDataType.DINT,
    {
      size: 4,
      // encode: signed 32-bit little-endian
      encode: (v) => {
        const buf = Buffer.alloc(4);
        buf.writeInt32LE(v as number, 0);
        return buf;
      },
      // decode: signed 32-bit little-endian
      decode: (buf, off) => buf.readInt32LE(off),
    },
  ],
  [
    CIPDataType.LINT,
    {
      size: 8,
      // encode: signed 64-bit little-endian BigInt
      encode: (v) => {
        const buf = Buffer.alloc(8);
        buf.writeBigInt64LE(v as bigint, 0);
        return buf;
      },
      // decode: signed 64-bit little-endian → bigint
      decode: (buf, off) => buf.readBigInt64LE(off),
    },
  ],
  [
    CIPDataType.USINT,
    {
      size: 1,
      // encode: unsigned 8-bit
      encode: (v) => {
        const buf = Buffer.alloc(1);
        buf.writeUInt8(v as number, 0);
        return buf;
      },
      // decode: unsigned 8-bit
      decode: (buf, off) => buf.readUInt8(off),
    },
  ],
  [
    CIPDataType.UINT,
    {
      size: 2,
      // encode: unsigned 16-bit little-endian
      encode: (v) => {
        const buf = Buffer.alloc(2);
        buf.writeUInt16LE(v as number, 0);
        return buf;
      },
      // decode: unsigned 16-bit little-endian
      decode: (buf, off) => buf.readUInt16LE(off),
    },
  ],
  [
    CIPDataType.UDINT,
    {
      size: 4,
      // encode: unsigned 32-bit little-endian
      encode: (v) => {
        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(v as number, 0);
        return buf;
      },
      // decode: unsigned 32-bit little-endian
      decode: (buf, off) => buf.readUInt32LE(off),
    },
  ],
  [
    CIPDataType.REAL,
    {
      size: 4,
      // encode: 32-bit IEEE 754 float little-endian
      encode: (v) => {
        const buf = Buffer.alloc(4);
        buf.writeFloatLE(v as number, 0);
        return buf;
      },
      // decode: 32-bit IEEE 754 float little-endian
      decode: (buf, off) => buf.readFloatLE(off),
    },
  ],
  [
    CIPDataType.LREAL,
    {
      size: 8,
      // encode: 64-bit IEEE 754 double little-endian
      encode: (v) => {
        const buf = Buffer.alloc(8);
        buf.writeDoubleLE(v as number, 0);
        return buf;
      },
      // decode: 64-bit IEEE 754 double little-endian
      decode: (buf, off) => buf.readDoubleLE(off),
    },
  ],
  [
    CIPDataType.STRING,
    {
      size: STRING_TOTAL_SIZE,
      // encode: 4-byte DINT length prefix + up to 82 ASCII chars, zero-padded to 88 bytes
      encode: (v) => {
        const str = v as string;
        const buf = Buffer.alloc(STRING_TOTAL_SIZE);
        const len = Math.min(str.length, STRING_MAX_CHARS);
        buf.writeInt32LE(len, 0);
        buf.write(str.slice(0, len), STRING_LENGTH_PREFIX_SIZE, 'ascii');
        return buf;
      },
      // decode: read 4-byte DINT length, then extract that many ASCII chars
      decode: (buf, off) => {
        const len = buf.readInt32LE(off);
        return buf.toString(
          'ascii',
          off + STRING_LENGTH_PREFIX_SIZE,
          off + STRING_LENGTH_PREFIX_SIZE + len,
        );
      },
    },
  ],
  [
    CIPDataType.SHORT_STRING,
    {
      size: 0, // variable length
      // encode: 1-byte length prefix + ASCII chars
      encode: (v) => {
        const str = v as string;
        const buf = Buffer.alloc(1 + str.length);
        buf.writeUInt8(str.length, 0);
        buf.write(str, 1, 'ascii');
        return buf;
      },
      // decode: read 1-byte length, then extract that many ASCII chars
      decode: (buf, off) => {
        const len = buf.readUInt8(off);
        return buf.toString('ascii', off + 1, off + 1 + len);
      },
    },
  ],
  [
    CIPDataType.BIT_STRING,
    {
      size: 4,
      // encode: unsigned 32-bit little-endian bit field
      encode: (v) => {
        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(v as number, 0);
        return buf;
      },
      // decode: unsigned 32-bit little-endian bit field
      decode: (buf, off) => buf.readUInt32LE(off),
    },
  ],
  [
    CIPDataType.WORD,
    {
      size: 2,
      // encode: unsigned 16-bit little-endian
      encode: (v) => {
        const buf = Buffer.alloc(2);
        buf.writeUInt16LE(v as number, 0);
        return buf;
      },
      // decode: unsigned 16-bit little-endian
      decode: (buf, off) => buf.readUInt16LE(off),
    },
  ],
  [
    CIPDataType.DWORD,
    {
      size: 4,
      // encode: unsigned 32-bit little-endian
      encode: (v) => {
        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(v as number, 0);
        return buf;
      },
      // decode: unsigned 32-bit little-endian
      decode: (buf, off) => buf.readUInt32LE(off),
    },
  ],
  [
    CIPDataType.LWORD,
    {
      size: 8,
      // encode: unsigned 64-bit little-endian BigInt
      encode: (v) => {
        const buf = Buffer.alloc(8);
        buf.writeBigUInt64LE(v as bigint, 0);
        return buf;
      },
      // decode: unsigned 64-bit little-endian → bigint
      decode: (buf, off) => buf.readBigUInt64LE(off),
    },
  ],
]);

/** Conservative size estimates for batch builder planning. SHORT_STRING uses 88 as upper bound. */
export const TYPE_SIZES: ReadonlyMap<CIPDataType, number> = new Map<CIPDataType, number>([
  [CIPDataType.BOOL, 1],
  [CIPDataType.SINT, 1],
  [CIPDataType.INT, 2],
  [CIPDataType.DINT, 4],
  [CIPDataType.LINT, 8],
  [CIPDataType.USINT, 1],
  [CIPDataType.UINT, 2],
  [CIPDataType.UDINT, 4],
  [CIPDataType.REAL, 4],
  [CIPDataType.LREAL, 8],
  [CIPDataType.STRING, STRING_TOTAL_SIZE],
  [CIPDataType.SHORT_STRING, STRING_TOTAL_SIZE],
  [CIPDataType.BIT_STRING, 4],
  [CIPDataType.WORD, 2],
  [CIPDataType.DWORD, 4],
  [CIPDataType.LWORD, 8],
]);

const TYPE_NAMES: ReadonlyMap<CIPDataType, string> = new Map(
  Object.entries(CIPDataType)
    .filter(([k]) => isNaN(Number(k)))
    .map(([k, v]) => [v as CIPDataType, k]),
);

export function getCodec(type: CIPDataType): DataCodec {
  const codec = CODEC_REGISTRY.get(type);
  if (!codec) throw new Error(`No codec for type 0x${type.toString(16)}`);
  return codec;
}

export function getTypeName(type: CIPDataType): string {
  return TYPE_NAMES.get(type) ?? `UNKNOWN(0x${type.toString(16)})`;
}

export function isValidType(type: number): type is CIPDataType {
  return CODEC_REGISTRY.has(type as CIPDataType);
}

/** Encode an array of values into a contiguous buffer */
export function encodeArray(type: CIPDataType, values: unknown[]): Buffer {
  const codec = getCodec(type);
  return Buffer.concat(values.map((v) => codec.encode(v)));
}

/** Decode count elements from buffer starting at offset */
export function decodeArray(
  type: CIPDataType,
  buf: Buffer,
  offset: number,
  count: number,
): unknown[] {
  const codec = getCodec(type);
  const results: unknown[] = [];
  let pos = offset;
  for (let i = 0; i < count; i++) {
    results.push(codec.decode(buf, pos));
    pos += codec.size;
  }
  return results;
}
