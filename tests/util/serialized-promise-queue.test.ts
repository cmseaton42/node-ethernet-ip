import { SerializedPromiseQueue } from '@/util/serialized-promise-queue';

describe('SerializedPromiseQueue', () => {
  it('runs operations in order', async () => {
    const queue = new SerializedPromiseQueue();
    const order: number[] = [];

    const p1 = queue.enqueue(async () => {
      await delay(30);
      order.push(1);
    });
    const p2 = queue.enqueue(async () => {
      order.push(2);
    });
    const p3 = queue.enqueue(async () => {
      order.push(3);
    });

    await Promise.all([p1, p2, p3]);
    expect(order).toEqual([1, 2, 3]);
  });

  it('returns the result of each operation', async () => {
    const queue = new SerializedPromiseQueue();

    const a = queue.enqueue(async () => 'hello');
    const b = queue.enqueue(async () => 42);

    expect(await a).toBe('hello');
    expect(await b).toBe(42);
  });

  it('surfaces errors to the caller', async () => {
    const queue = new SerializedPromiseQueue();

    const failing = queue.enqueue(async () => {
      throw new Error('boom');
    });

    await expect(failing).rejects.toThrow('boom');
  });

  it('continues after a failed operation', async () => {
    const queue = new SerializedPromiseQueue();

    const failing = queue.enqueue(async () => {
      throw new Error('boom');
    });
    const next = queue.enqueue(async () => 'ok');

    await expect(failing).rejects.toThrow('boom');
    expect(await next).toBe('ok');
  });

  it('does not run operations concurrently', async () => {
    const queue = new SerializedPromiseQueue();
    let running = 0;
    let maxConcurrent = 0;

    const task = () =>
      queue.enqueue(async () => {
        running++;
        maxConcurrent = Math.max(maxConcurrent, running);
        await delay(10);
        running--;
      });

    await Promise.all([task(), task(), task(), task()]);
    expect(maxConcurrent).toBe(1);
  });
});

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
