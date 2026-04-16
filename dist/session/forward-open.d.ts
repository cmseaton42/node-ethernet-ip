/**
 * Forward Open / Forward Close.
 * Per CIP Vol 1, Section 3-5
 *
 * Forward Open tries Large (4002 bytes) first, falls back to Small (504).
 */
import { RequestPipeline } from '../pipeline/request-pipeline';
/** Small Forward Open max connection size */
export declare const SMALL_CONNECTION_SIZE = 504;
/** Large Forward Open max connection size */
export declare const LARGE_CONNECTION_SIZE = 4002;
export interface ForwardOpenResult {
    connectionId: number;
    connectionSize: number;
    connectionSerial: number;
}
/**
 * Attempt Forward Open — Large first, fallback to Small.
 * Returns the negotiated connection size and serial.
 */
export declare function doForwardOpen(pipeline: RequestPipeline, sessionId: number, slot: number, timeoutMs: number): Promise<ForwardOpenResult>;
/**
 * Send Forward Close (best-effort, won't throw on failure).
 */
export declare function doForwardClose(pipeline: RequestPipeline, sessionId: number, connectionSerial: number, timeoutMs: number): Promise<void>;
//# sourceMappingURL=forward-open.d.ts.map