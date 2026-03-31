/**
 * SerializedPromiseQueue — runs async operations one at a time, in order.
 *
 * Each enqueued operation waits for all previous operations to finish
 * before starting. A failed operation surfaces its error to the caller
 * but does not block subsequent operations.
 */
export class SerializedPromiseQueue {
  private tail: Promise<void> = Promise.resolve();

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((r) => (release = r));
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
