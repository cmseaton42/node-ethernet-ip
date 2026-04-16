/**
 * Request Pipeline — serializes CIP requests over an ITransport.
 *
 * Rockwell PLCs process one CIP request at a time per connection.
 * The pipeline queues requests and sends them one by one, matching
 * each write to the next incoming data event as the response.
 *
 * Handles partial TCP reads by accumulating data until the full
 * EIP packet (24-byte header + payload) is received.
 */
import { ITransport } from '../transport/interfaces';
export declare class RequestPipeline {
    private readonly transport;
    private queue;
    private pending;
    private recvBuffer;
    constructor(transport: ITransport);
    /**
     * Send a CIP request and wait for the response.
     * Requests are queued and processed one at a time.
     */
    send(data: Buffer, timeout?: number): Promise<Buffer>;
    /** Flush all pending/queued requests with an error (e.g. on disconnect) */
    flush(err: Error): void;
    private processNext;
    /**
     * Handle incoming data from transport.
     * Accumulates partial reads until a complete EIP packet is received.
     */
    private handleData;
}
//# sourceMappingURL=request-pipeline.d.ts.map