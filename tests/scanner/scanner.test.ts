import { Scanner } from '@/scanner/scanner';

describe('Scanner', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts not scanning', () => {
    const scanner = new Scanner(jest.fn(), { rate: 100 });
    expect(scanner.scanning).toBe(false);
  });

  it('subscribes and unsubscribes tags', () => {
    const scanner = new Scanner(jest.fn(), { rate: 100 });
    scanner.subscribe('MyTag');
    scanner.unsubscribe('MyTag');
  });

  it('emits tagInitialized on first scan', async () => {
    const readFn = jest.fn().mockResolvedValue([42]);
    const scanner = new Scanner(readFn, { rate: 100 });
    const initialized = jest.fn();

    scanner.subscribe('MyDINT');
    scanner.on('tagInitialized', initialized);
    scanner.scan();

    await jest.advanceTimersByTimeAsync(100);

    expect(initialized).toHaveBeenCalledWith('MyDINT', 42);
    scanner.pause();
  });

  it('emits tagChanged when value changes', async () => {
    let callCount = 0;
    const readFn = jest.fn().mockImplementation(async () => [++callCount === 1 ? 10 : 20]);
    const scanner = new Scanner(readFn, { rate: 100 });
    const changed = jest.fn();

    scanner.subscribe('MyTag');
    scanner.on('tagChanged', changed);
    scanner.scan();

    await jest.advanceTimersByTimeAsync(100);

    await jest.advanceTimersByTimeAsync(100);

    expect(changed).toHaveBeenCalledWith('MyTag', 20, 10);
    scanner.pause();
  });

  it('does not emit tagChanged when value is same', async () => {
    const readFn = jest.fn().mockResolvedValue([42]);
    const scanner = new Scanner(readFn, { rate: 100 });
    const changed = jest.fn();

    scanner.subscribe('MyTag');
    scanner.on('tagChanged', changed);
    scanner.scan();

    await jest.advanceTimersByTimeAsync(100);

    await jest.advanceTimersByTimeAsync(100);

    expect(changed).not.toHaveBeenCalled();
    scanner.pause();
  });

  it('does not emit tagChanged when struct value is deeply equal', async () => {
    const readFn = jest.fn().mockImplementation(async () => [{ a: 1, b: true }]);
    const scanner = new Scanner(readFn, { rate: 100 });
    const changed = jest.fn();

    scanner.subscribe('MyStruct');
    scanner.on('tagChanged', changed);
    scanner.scan();

    await jest.advanceTimersByTimeAsync(100);

    await jest.advanceTimersByTimeAsync(100);

    expect(changed).not.toHaveBeenCalled();
    scanner.pause();
  });

  it('emits scanError on read failure', async () => {
    const readFn = jest.fn().mockRejectedValue(new Error('read failed'));
    const scanner = new Scanner(readFn, { rate: 100 });
    const errorFn = jest.fn();

    scanner.subscribe('BadTag');
    scanner.on('scanError', errorFn);
    scanner.scan();

    await jest.advanceTimersByTimeAsync(100);

    expect(errorFn).toHaveBeenCalled();
    scanner.pause();
  });

  it('pause stops the timer', () => {
    const readFn = jest.fn().mockResolvedValue([1]);
    const scanner = new Scanner(readFn, { rate: 100 });

    scanner.subscribe('Tag1');
    scanner.scan();
    scanner.pause();

    readFn.mockClear();
    jest.advanceTimersByTime(1000);
    expect(readFn).not.toHaveBeenCalled();
  });

  it('scan is idempotent', () => {
    const readFn = jest.fn().mockResolvedValue([1]);
    const scanner = new Scanner(readFn, { rate: 100 });
    scanner.subscribe('Tag');
    scanner.scan();
    scanner.scan();
    scanner.pause();
  });

  it('uses default rate when none provided', () => {
    const scanner = new Scanner(jest.fn(), { rate: 100 });
    expect(scanner.scanning).toBe(false);
  });

  it('emits scanStarted and scanStopped', () => {
    const scanner = new Scanner(jest.fn().mockResolvedValue([]), { rate: 100 });
    const events: string[] = [];
    scanner.on('scanStarted', () => events.push('started'));
    scanner.on('scanStopped', () => events.push('stopped'));
    scanner.subscribe('Tag');
    scanner.scan();
    scanner.pause();
    expect(events).toEqual(['started', 'stopped']);
  });

  it('pause is idempotent', () => {
    const scanner = new Scanner(jest.fn().mockResolvedValue([]));
    const events: string[] = [];
    scanner.on('scanStopped', () => events.push('stopped'));
    scanner.pause();
    expect(events).toEqual([]);
  });
});

describe('live subscribe/unsubscribe', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('picks up new subscriptions on next tick', async () => {
    const readFn = jest.fn().mockImplementation(async (tags: string[]) => tags.map(() => 1));
    const scanner = new Scanner(readFn, { rate: 100 });
    const initialized = jest.fn();

    scanner.subscribe('TagA');
    scanner.on('tagInitialized', initialized);
    scanner.scan();

    await jest.advanceTimersByTimeAsync(100);

    expect(initialized).toHaveBeenCalledWith('TagA', 1);

    // Subscribe while running
    scanner.subscribe('TagB');

    await jest.advanceTimersByTimeAsync(100);

    expect(initialized).toHaveBeenCalledWith('TagB', 1);
    scanner.pause();
  });

  it('skips unsubscribed tags on next tick', async () => {
    let callCount = 0;
    const readFn = jest.fn().mockImplementation(async (tags: string[]) => {
      callCount++;
      return tags.map(() => callCount);
    });
    const scanner = new Scanner(readFn, { rate: 100 });

    scanner.subscribe('TagA');
    scanner.subscribe('TagB');
    scanner.scan();

    await jest.advanceTimersByTimeAsync(100);

    scanner.unsubscribe('TagB');

    await jest.advanceTimersByTimeAsync(100);

    const lastCall = readFn.mock.calls[readFn.mock.calls.length - 1];
    expect(lastCall[0]).toEqual(['TagA']);
    scanner.pause();
  });

  it('skips tick when all tags unsubscribed', async () => {
    const readFn = jest.fn().mockResolvedValue([1]);
    const scanner = new Scanner(readFn, { rate: 100 });

    scanner.subscribe('OnlyTag');
    scanner.scan();

    await jest.advanceTimersByTimeAsync(100);

    const callsBefore = readFn.mock.calls.length;
    scanner.unsubscribe('OnlyTag');

    await jest.advanceTimersByTimeAsync(100);

    expect(readFn.mock.calls.length).toBe(callsBefore);
    scanner.pause();
  });

  it('duplicate subscribe is a no-op', async () => {
    const readFn = jest.fn().mockImplementation(async (tags: string[]) => tags.map(() => 1));
    const scanner = new Scanner(readFn, { rate: 100 });

    scanner.subscribe('Tag');
    scanner.subscribe('Tag');
    scanner.scan();

    await jest.advanceTimersByTimeAsync(100);

    expect(readFn.mock.calls[0][0]).toEqual(['Tag']);
    scanner.pause();
  });

  it('preserves subscriptions across pause/scan', async () => {
    const readFn = jest.fn().mockResolvedValue([1]);
    const scanner = new Scanner(readFn, { rate: 100 });
    const initialized = jest.fn();

    scanner.subscribe('Tag');
    scanner.on('tagInitialized', initialized);
    scanner.scan();

    await jest.advanceTimersByTimeAsync(100);

    scanner.pause();
    scanner.scan();

    await jest.advanceTimersByTimeAsync(100);

    // Tag was already initialized — should not re-initialize
    expect(initialized).toHaveBeenCalledTimes(1);
    scanner.pause();
  });

  it('emits tagInitialized even when listener is registered after scan()', async () => {
    const readFn = jest.fn().mockResolvedValue([42]);
    const scanner = new Scanner(readFn, { rate: 100 });

    scanner.subscribe('MyTag');
    scanner.scan();

    // Listener registered AFTER scan() — must still receive the event
    const initialized = jest.fn();
    scanner.on('tagInitialized', initialized);

    await jest.advanceTimersByTimeAsync(100);

    expect(initialized).toHaveBeenCalledWith('MyTag', 42);
    scanner.pause();
  });
});
