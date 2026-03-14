import {
  CIPDataType,
  TYPE_SIZES,
  getCodec,
  getTypeName,
  isValidType,
  encodeArray,
  decodeArray,
} from '@/cip/data-types';

describe('CIPDataType enum', () => {
  it('has correct hex values', () => {
    expect(CIPDataType.BOOL).toBe(0xc1);
    expect(CIPDataType.SINT).toBe(0xc2);
    expect(CIPDataType.INT).toBe(0xc3);
    expect(CIPDataType.DINT).toBe(0xc4);
    expect(CIPDataType.LINT).toBe(0xc5);
    expect(CIPDataType.USINT).toBe(0xc6);
    expect(CIPDataType.UINT).toBe(0xc7);
    expect(CIPDataType.UDINT).toBe(0xc8);
    expect(CIPDataType.REAL).toBe(0xca);
    expect(CIPDataType.LREAL).toBe(0xcb);
    expect(CIPDataType.STRING).toBe(0xd0);
    expect(CIPDataType.SHORT_STRING).toBe(0xda);
    expect(CIPDataType.BIT_STRING).toBe(0xd3);
    expect(CIPDataType.WORD).toBe(0xd1);
    expect(CIPDataType.DWORD).toBe(0xd2);
    expect(CIPDataType.LWORD).toBe(0xd4);
    expect(CIPDataType.STRUCT).toBe(0xa002);
  });
});

describe('BOOL codec', () => {
  const codec = getCodec(CIPDataType.BOOL);

  it('round-trips true', () => {
    const buf = codec.encode(true);
    expect(buf.length).toBe(1);
    expect(codec.decode(buf, 0)).toBe(true);
  });

  it('round-trips false', () => {
    const buf = codec.encode(false);
    expect(codec.decode(buf, 0)).toBe(false);
  });
});

describe('SINT codec', () => {
  const codec = getCodec(CIPDataType.SINT);

  it('round-trips -128', () => {
    expect(codec.decode(codec.encode(-128), 0)).toBe(-128);
  });

  it('round-trips 127', () => {
    expect(codec.decode(codec.encode(127), 0)).toBe(127);
  });
});

describe('INT codec', () => {
  const codec = getCodec(CIPDataType.INT);

  it('round-trips -32768', () => {
    expect(codec.decode(codec.encode(-32768), 0)).toBe(-32768);
  });

  it('round-trips 32767', () => {
    expect(codec.decode(codec.encode(32767), 0)).toBe(32767);
  });
});

describe('DINT codec', () => {
  const codec = getCodec(CIPDataType.DINT);

  it('round-trips boundaries', () => {
    expect(codec.decode(codec.encode(-2147483648), 0)).toBe(-2147483648);
    expect(codec.decode(codec.encode(2147483647), 0)).toBe(2147483647);
  });
});

describe('LINT codec', () => {
  const codec = getCodec(CIPDataType.LINT);

  it('round-trips BigInt', () => {
    const val = BigInt('9223372036854775807');
    const result = codec.decode(codec.encode(val), 0);
    expect(result).toBe(val);
  });
});

describe('USINT codec', () => {
  it('round-trips 0 and 255', () => {
    const codec = getCodec(CIPDataType.USINT);
    expect(codec.decode(codec.encode(0), 0)).toBe(0);
    expect(codec.decode(codec.encode(255), 0)).toBe(255);
  });
});

describe('UINT codec', () => {
  it('round-trips 65535', () => {
    const codec = getCodec(CIPDataType.UINT);
    expect(codec.decode(codec.encode(65535), 0)).toBe(65535);
  });
});

describe('UDINT codec', () => {
  it('round-trips 4294967295', () => {
    const codec = getCodec(CIPDataType.UDINT);
    expect(codec.decode(codec.encode(4294967295), 0)).toBe(4294967295);
  });
});

describe('REAL codec', () => {
  it('round-trips 3.14 approximately', () => {
    const codec = getCodec(CIPDataType.REAL);
    const result = codec.decode(codec.encode(3.14), 0) as number;
    expect(result).toBeCloseTo(3.14, 2);
  });
});

describe('LREAL codec', () => {
  it('round-trips 3.141592653589793', () => {
    const codec = getCodec(CIPDataType.LREAL);
    expect(codec.decode(codec.encode(3.141592653589793), 0)).toBe(3.141592653589793);
  });
});

describe('STRING codec', () => {
  const codec = getCodec(CIPDataType.STRING);

  it('encodes "Hello" to 88 bytes', () => {
    const buf = codec.encode('Hello');
    expect(buf.length).toBe(88);
    expect(codec.decode(buf, 0)).toBe('Hello');
  });

  it('round-trips empty string', () => {
    const buf = codec.encode('');
    expect(buf.length).toBe(88);
    expect(codec.decode(buf, 0)).toBe('');
  });
});

describe('SHORT_STRING codec', () => {
  it('encodes "Hi" to 3 bytes', () => {
    const codec = getCodec(CIPDataType.SHORT_STRING);
    const buf = codec.encode('Hi');
    expect(buf.length).toBe(3);
    expect(codec.decode(buf, 0)).toBe('Hi');
  });
});

describe('WORD codec', () => {
  it('round-trips 0xABCD', () => {
    const codec = getCodec(CIPDataType.WORD);
    expect(codec.decode(codec.encode(0xabcd), 0)).toBe(0xabcd);
  });
});

describe('DWORD codec', () => {
  it('round-trips 0xDEADBEEF', () => {
    const codec = getCodec(CIPDataType.DWORD);
    expect(codec.decode(codec.encode(0xdeadbeef), 0)).toBe(0xdeadbeef);
  });
});

describe('LWORD codec', () => {
  it('round-trips BigInt', () => {
    const codec = getCodec(CIPDataType.LWORD);
    const val = BigInt('18446744073709551615');
    expect(codec.decode(codec.encode(val), 0)).toBe(val);
  });
});

describe('BIT_STRING codec', () => {
  it('round-trips 0xFF00FF00', () => {
    const codec = getCodec(CIPDataType.BIT_STRING);
    expect(codec.decode(codec.encode(0xff00ff00), 0)).toBe(0xff00ff00);
  });
});

describe('encodeArray / decodeArray', () => {
  it('round-trips [1, 2, 3] as DINT', () => {
    const buf = encodeArray(CIPDataType.DINT, [1, 2, 3]);
    expect(buf.length).toBe(12);
    expect(decodeArray(CIPDataType.DINT, buf, 0, 3)).toEqual([1, 2, 3]);
  });
});

describe('getTypeName', () => {
  it('returns "DINT" for CIPDataType.DINT', () => {
    expect(getTypeName(CIPDataType.DINT)).toBe('DINT');
  });

  it('returns UNKNOWN for unregistered type', () => {
    expect(getTypeName(0xff as CIPDataType)).toMatch(/UNKNOWN/);
  });
});

describe('getCodec', () => {
  it('throws for unregistered type', () => {
    expect(() => getCodec(0xff as CIPDataType)).toThrow('No codec');
  });
});

describe('isValidType', () => {
  it('returns true for BOOL', () => {
    expect(isValidType(0xc1)).toBe(true);
  });

  it('returns false for STRUCT (no codec registered)', () => {
    expect(isValidType(0xa002)).toBe(false);
  });

  it('returns false for arbitrary value', () => {
    expect(isValidType(0x00)).toBe(false);
  });
});

describe('TYPE_SIZES', () => {
  it('has correct sizes for all registered types', () => {
    expect(TYPE_SIZES.get(CIPDataType.BOOL)).toBe(1);
    expect(TYPE_SIZES.get(CIPDataType.SINT)).toBe(1);
    expect(TYPE_SIZES.get(CIPDataType.INT)).toBe(2);
    expect(TYPE_SIZES.get(CIPDataType.DINT)).toBe(4);
    expect(TYPE_SIZES.get(CIPDataType.LINT)).toBe(8);
    expect(TYPE_SIZES.get(CIPDataType.USINT)).toBe(1);
    expect(TYPE_SIZES.get(CIPDataType.UINT)).toBe(2);
    expect(TYPE_SIZES.get(CIPDataType.UDINT)).toBe(4);
    expect(TYPE_SIZES.get(CIPDataType.REAL)).toBe(4);
    expect(TYPE_SIZES.get(CIPDataType.LREAL)).toBe(8);
    expect(TYPE_SIZES.get(CIPDataType.STRING)).toBe(88);
    expect(TYPE_SIZES.get(CIPDataType.SHORT_STRING)).toBe(88);
    expect(TYPE_SIZES.get(CIPDataType.BIT_STRING)).toBe(4);
    expect(TYPE_SIZES.get(CIPDataType.WORD)).toBe(2);
    expect(TYPE_SIZES.get(CIPDataType.DWORD)).toBe(4);
    expect(TYPE_SIZES.get(CIPDataType.LWORD)).toBe(8);
  });
});
