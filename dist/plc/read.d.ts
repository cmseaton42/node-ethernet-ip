/**
 * Read helpers — build read requests and parse responses.
 */
import { TagValue } from './types';
/**
 * Build a CIP Read Tag request.
 */
export declare function buildReadRequest(tagName: string, count?: number): Buffer;
/**
 * Detect struct type marker (wire bytes A0 02).
 */
export declare function isStructTypeParam(data: Buffer): boolean;
/** Rockwell built-in STRING struct handle — STRING tags report as struct, not atomic 0xD0.
 *  Custom string UDTs (e.g. STRING20) will have different handles and need template retrieval. */
/**
 * Parse a CIP Read Tag response into a JS value.
 *
 * Atomic response data:  [typeCode(2), value(N)]
 * Struct response data:  [A0 02(2), structHandle(2), value(N)]
 */
export declare function parseReadResponse(data: Buffer, tagName: string): {
    type: number;
    isStruct: boolean;
    value: TagValue;
};
//# sourceMappingURL=read.d.ts.map