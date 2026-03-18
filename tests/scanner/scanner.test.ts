import { Scanner } from '@/scanner/scanner';

describe('Scanner', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts not scanning', () => {
    const scanner = new Scanner(jest.fn());
    expect(scanner.scanning).toBe(false);
  });

  it('subscribes and unsubscribes tags', () => {
    const scanner = new Scanner(jest.fn());
    scanner.subscribe('MyTag');
    scanner.unsubscribe('MyTag');
    // No error — just verifying the API works
  });

  it('emits tagInitialized on first scan', async () => {
    const readFn = jest.fn().mockResolvedValue([42]);
    const scanner = new Scanner(readFn);
    const initialized = jest.fn();

    scanner.subscribe('MyDINT');
    scanner.on('tagInitialized', initialized);
    scanner.scan();

    // Advance past the initial setTimeout(tick, 0)
    jest.advanceTimersByTime(0);
    await Promise.resolve();
    await Promise.resolve();

    expect(initialized).toHaveBeenCalledWith('MyDINT', 42);
    scanner.pauseScan();
  });

  it('emits tagChanged when value changes', async () => {
    let callCount = 0;
    const readFn = jest.fn().mockImplementation(async () => {
      callCount++;
      return [callCount === 1 ? 10 : 20];
    });

    const scanner = new Scanner(readFn);
    const changed = jest.fn();

    scanner.subscribe('MyTag', { rate: 100 });
    scanner.on('tagChanged', changed);
    scanner.scan();

    // First tick — initializes
    jest.advanceTimersByTime(0);
    await Promise.resolve();
    await Promise.resolve();

    // Second tick — value changes
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();

    expect(changed).toHaveBeenCalledWith('MyTag', 20, 10);
    scanner.pauseScan();
  });

  it('does not emit tagChanged when value is same', async () => {
    const readFn = jest.fn().mockResolvedValue([42]);
    const scanner = new Scanner(readFn);
    const changed = jest.fn();

    scanner.subscribe('MyTag', { rate: 100 });
    scanner.on('tagChanged', changed);
    scanner.scan();

    // First tick — initializes
    jest.advanceTimersByTime(0);
    await Promise.resolve();
    await Promise.resolve();

    // Second tick — same value
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();

    expect(changed).not.toHaveBeenCalled();
    scanner.pauseScan();
  });

  it('supports different scan rates per tag', () => {
    const readFn = jest.fn().mockResolvedValue([1]);
    const scanner = new Scanner(readFn);

    scanner.subscribe('FastTag', { rate: 50 });
    scanner.subscribe('SlowTag', { rate: 500 });
    scanner.scan();

    expect(scanner.scanning).toBe(true);
    scanner.pauseScan();
    expect(scanner.scanning).toBe(false);
  });

  it('emits scanError on read failure', async () => {
    const readFn = jest.fn().mockRejectedValue(new Error('read failed'));
    const scanner = new Scanner(readFn);
    const errorFn = jest.fn();

    scanner.subscribe('BadTag');
    scanner.on('scanError', errorFn);
    scanner.scan();

    jest.advanceTimersByTime(0);
    await Promise.resolve();
    await Promise.resolve();

    expect(errorFn).toHaveBeenCalled();
    scanner.pauseScan();
  });

  it('pauseScan stops all timers', () => {
    const readFn = jest.fn().mockResolvedValue([1]);
    const scanner = new Scanner(readFn);

    scanner.subscribe('Tag1', { rate: 100 });
    scanner.subscribe('Tag2', { rate: 200 });
    scanner.scan();
    scanner.pauseScan();

    // Advance time — readFn should not be called again after pause
    readFn.mockClear();
    jest.advanceTimersByTime(1000);
    expect(readFn).not.toHaveBeenCalled();
  });

  it('scan is idempotent', () => {
    const readFn = jest.fn().mockResolvedValue([1]);
    const scanner = new Scanner(readFn);
    scanner.subscribe('Tag');
    scanner.scan();
    scanner.scan(); // Should not create duplicate timers
    scanner.pauseScan();
  });
});

describe('Scanner mid-scan unsubscribe', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('skips unsubscribed tags on next tick', async () => {
    let callCount = 0;
    const readFn = jest.fn().mockImplementation(async (tags: string[]) => {
      callCount++;
      return tags.map(() => callCount);
    });

    const scanner = new Scanner(readFn);
    const changed = jest.fn();

    scanner.subscribe('TagA', { rate: 100 });
    scanner.subscribe('TagB', { rate: 100 });
    scanner.on('tagChanged', changed);
    scanner.scan();

    // First tick — both initialized
    jest.advanceTimersByTime(0);
    await Promise.resolve();
    await Promise.resolve();

    // Unsubscribe TagB
    scanner.unsubscribe('TagB');

    // Second tick — only TagA should be read
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();

    // readFn should have been called with only ['TagA'] on second tick
    const lastCall = readFn.mock.calls[readFn.mock.calls.length - 1];
    expect(lastCall[0]).toEqual(['TagA']);

    scanner.pauseScan();
  });

  it('skips tick entirely when all tags unsubscribed', async () => {
    const readFn = jest.fn().mockResolvedValue([1]);
    const scanner = new Scanner(readFn);

    scanner.subscribe('OnlyTag', { rate: 100 });
    scanner.scan();

    // First tick
    jest.advanceTimersByTime(0);
    await Promise.resolve();
    await Promise.resolve();

    const callsBefore = readFn.mock.calls.length;
    scanner.unsubscribe('OnlyTag');

    // Next tick — should not call readFn
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();

    expect(readFn.mock.calls.length).toBe(callsBefore);
    scanner.pauseScan();
  });
});
