/** CIP data type codes per CIP specification Volume 1 */
export declare enum CIPDataType {
    BOOL = 193,
    SINT = 194,
    INT = 195,
    DINT = 196,
    LINT = 197,
    USINT = 198,
    UINT = 199,
    UDINT = 200,
    REAL = 202,
    LREAL = 203,
    STRING = 208,
    SHORT_STRING = 218,
    BIT_STRING = 211,
    WORD = 209,
    DWORD = 210,
    LWORD = 212,
    STRUCT = 40962
}
export interface DataCodec {
    size: number;
    encode(value: unknown): Buffer;
    decode(buf: Buffer, offset: number): unknown;
}
/** Rockwell built-in STRING struct handle (CRC). Used in Tag Type Service Parameter on the wire. */
export declare const STRING_STRUCT_HANDLE = 4046;
export declare const CODEC_REGISTRY: ReadonlyMap<CIPDataType, DataCodec>;
/** Conservative size estimates for batch builder planning. SHORT_STRING uses 88 as upper bound. */
export declare const TYPE_SIZES: ReadonlyMap<CIPDataType, number>;
export declare function getCodec(type: CIPDataType): DataCodec;
export declare function getTypeName(type: CIPDataType): string;
export declare function isValidType(type: number): type is CIPDataType;
/** Encode an array of values into a contiguous buffer */
export declare function encodeArray(type: CIPDataType, values: unknown[]): Buffer;
/** Decode count elements from buffer starting at offset */
export declare function decodeArray(type: CIPDataType, buf: Buffer, offset: number, count: number): unknown[];
//# sourceMappingURL=data-types.d.ts.map