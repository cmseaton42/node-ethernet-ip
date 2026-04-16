/**
 * Register / Unregister EIP Session.
 * Per CIP Vol 2, Section 2-4.7 and 2-4.8
 */
import { RequestPipeline } from '../pipeline/request-pipeline';
import { ITransport } from '../transport/interfaces';
/**
 * Send RegisterSession and return the session ID.
 */
export declare function doRegisterSession(pipeline: RequestPipeline, timeoutMs: number): Promise<number>;
/**
 * Send UnregisterSession (fire-and-forget, no response expected).
 */
export declare function doUnregisterSession(transport: ITransport, sessionId: number): void;
//# sourceMappingURL=register-session.d.ts.map