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

import { ITransport } from '@/transport/interfaces';
import { EIP_HEADER_SIZE } from '@/encapsulation/header';
import { TimeoutError } from '@/errors';

const DEFAULT_TIMEOUT_MS = 10000;

/** Offset of the payload length field in the EIP header */
const PAYLOAD_LENGTH_OFFSET = 2;

interface PendingRequest {
  resolve: (data: Buffer) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface QueuedRequest {
  data: Buffer;
  timeout: number;
  resolve: (data: Buffer) => void;
  reject: (err: Error) => void;
}

export class RequestPipeline {
  private queue: QueuedRequest[] = [];
  private pending: PendingRequest | null = null;
  private recvBuffer: Buffer = Buffer.alloc(0);

  constructor(private readonly transport: ITransport) {
    this.transport.onData(this.handleData.bind(this));
  }

  /**
   * Send a CIP request and wait for the response.
   * Requests are queued and processed one at a time.
   */
  send(data: Buffer, timeout = DEFAULT_TIMEOUT_MS): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      this.queue.push({ data, timeout, resolve, reject });
      this.processNext();
    });
  }

  /** Flush all pending/queued requests with an error (e.g. on disconnect) */
  flush(err: Error): void {
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(err);
      this.pending = null;
    }
    for (const item of this.queue) {
      item.reject(err);
    }
    this.queue = [];
    this.recvBuffer = Buffer.alloc(0);
  }

  private processNext(): void {
    if (this.pending || this.queue.length === 0) return;

    const item = this.queue.shift()!;

    const timer = setTimeout(() => {
      this.pending = null;
      item.reject(new TimeoutError('Request timed out', item.timeout));
      this.processNext();
    }, item.timeout);

    this.pending = { resolve: item.resolve, reject: item.reject, timer };

    this.transport.write(item.data);
  }

  /**
   * Handle incoming data from transport.
   * Accumulates partial reads until a complete EIP packet is received.
   */
  private handleData(data: Buffer): void {
    this.recvBuffer = Buffer.concat([this.recvBuffer, data]);

    while (this.recvBuffer.length >= EIP_HEADER_SIZE) {
      const payloadLength = this.recvBuffer.readUInt16LE(PAYLOAD_LENGTH_OFFSET);
      const totalLength = EIP_HEADER_SIZE + payloadLength;

      if (this.recvBuffer.length < totalLength) break;

      // Extract complete packet
      const packet = Buffer.from(this.recvBuffer.subarray(0, totalLength));
      this.recvBuffer = this.recvBuffer.subarray(totalLength);

      if (this.pending) {
        clearTimeout(this.pending.timer);
        const { resolve } = this.pending;
        this.pending = null;
        resolve(packet);
        this.processNext();
      }
    }
  }
}
