/**
 * SerializedPromiseQueue — runs async operations one at a time, in order.
 *
 * Each enqueued operation waits for all previous operations to finish
 * before starting. A failed operation surfaces its error to the caller
 * but does not block subsequent operations.
 */
export declare class SerializedPromiseQueue {
    private tail;
    enqueue<T>(fn: () => Promise<T>): Promise<T>;
}
//# sourceMappingURL=serialized-promise-queue.d.ts.map