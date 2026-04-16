/**
 * Write helpers — build write and bit-write requests.
 */
import { TagValue } from './types';
/** Rockwell built-in STRING struct handle */
/**
 * Build a CIP Write Tag request.
 *
 * Atomic data layout:  [typeCode(2), count(2), encodedValue(N)]
 * Struct data layout:  [A0 02(2), structHandle(2), count(2), rawValue(N)]
 *
 * @param structHandle - When provided, writes 4-byte struct type param instead of 2-byte atomic
 */
export declare function buildWriteRequest(tagName: string, value: TagValue, typeCode: number, count?: number, structHandle?: number): Buffer;
/**
 * Build a CIP Read Modify Write Tag request for bit-of-word writes.
 * Data layout: [maskSize(2), orMask(N), andMask(N)]
 */
export declare function buildBitWriteRequest(tagName: string, value: boolean, typeCode: number): Buffer;
//# sourceMappingURL=write.d.ts.map