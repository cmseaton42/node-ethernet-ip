"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestPipeline = void 0;
const header_1 = require("../encapsulation/header");
const errors_1 = require("../errors");
const DEFAULT_TIMEOUT_MS = 10000;
/** Offset of the payload length field in the EIP header */
const PAYLOAD_LENGTH_OFFSET = 2;
class RequestPipeline {
    constructor(transport) {
        this.transport = transport;
        this.queue = [];
        this.pending = null;
        this.recvBuffer = Buffer.alloc(0);
        this.transport.onData(this.handleData.bind(this));
    }
    /**
     * Send a CIP request and wait for the response.
     * Requests are queued and processed one at a time.
     */
    send(data, timeout = DEFAULT_TIMEOUT_MS) {
        return new Promise((resolve, reject) => {
            this.queue.push({ data, timeout, resolve, reject });
            this.processNext();
        });
    }
    /** Flush all pending/queued requests with an error (e.g. on disconnect) */
    flush(err) {
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
    processNext() {
        if (this.pending || this.queue.length === 0)
            return;
        const item = this.queue.shift();
        const timer = setTimeout(() => {
            this.pending = null;
            item.reject(new errors_1.TimeoutError('Request timed out', item.timeout));
            this.processNext();
        }, item.timeout);
        this.pending = { resolve: item.resolve, reject: item.reject, timer };
        this.transport.write(item.data);
    }
    /**
     * Handle incoming data from transport.
     * Accumulates partial reads until a complete EIP packet is received.
     */
    handleData(data) {
        this.recvBuffer = Buffer.concat([this.recvBuffer, data]);
        while (this.recvBuffer.length >= header_1.EIP_HEADER_SIZE) {
            const payloadLength = this.recvBuffer.readUInt16LE(PAYLOAD_LENGTH_OFFSET);
            const totalLength = header_1.EIP_HEADER_SIZE + payloadLength;
            if (this.recvBuffer.length < totalLength)
                break;
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
exports.RequestPipeline = RequestPipeline;
//# sourceMappingURL=request-pipeline.js.map