"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerializedPromiseQueue = void 0;
/**
 * SerializedPromiseQueue — runs async operations one at a time, in order.
 *
 * Each enqueued operation waits for all previous operations to finish
 * before starting. A failed operation surfaces its error to the caller
 * but does not block subsequent operations.
 */
class SerializedPromiseQueue {
    constructor() {
        this.tail = Promise.resolve();
    }
    async enqueue(fn) {
        const prev = this.tail;
        let release;
        this.tail = new Promise((r) => (release = r));
        await prev;
        try {
            return await fn();
        }
        finally {
            release();
        }
    }
}
exports.SerializedPromiseQueue = SerializedPromiseQueue;
//# sourceMappingURL=serialized-promise-queue.js.map