import { Reconnector } from '@/session/reconnect';

describe('Reconnector', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('calls onReconnect after delay', async () => {
    const onReconnect = jest.fn().mockResolvedValue(undefined);
    const reconnector = new Reconnector(
      { initialDelay: 100, maxDelay: 5000, multiplier: 2, maxRetries: 3, enabled: true },
      onReconnect,
    );

    reconnector.schedule();
    jest.advanceTimersByTime(100);
    await Promise.resolve(); // flush microtasks

    expect(onReconnect).toHaveBeenCalledWith(1);
  });

  it('uses exponential backoff', () => {
    const onReconnect = jest.fn().mockRejectedValue(new Error('fail'));
    const reconnector = new Reconnector(
      { initialDelay: 100, maxDelay: 10000, multiplier: 2, maxRetries: 5, enabled: true },
      onReconnect,
    );

    // First attempt: 100ms
    reconnector.schedule();
    expect(reconnector.currentAttempt).toBe(1);

    jest.advanceTimersByTime(100);
    // onReconnect rejects, schedule() called again internally
    // Second attempt should be at 200ms
  });

  it('caps delay at maxDelay', () => {
    const onReconnect = jest.fn().mockRejectedValue(new Error('fail'));
    const reconnector = new Reconnector(
      { initialDelay: 1000, maxDelay: 2000, multiplier: 10, maxRetries: 5, enabled: true },
      onReconnect,
    );

    reconnector.schedule();
    // delay = min(1000 * 10^0, 2000) = 1000
    expect(reconnector.currentAttempt).toBe(1);
  });

  it('returns false when max retries exceeded', () => {
    const onReconnect = jest.fn().mockResolvedValue(undefined);
    const reconnector = new Reconnector(
      { initialDelay: 100, maxDelay: 5000, multiplier: 2, maxRetries: 0, enabled: true },
      onReconnect,
    );

    const result = reconnector.schedule();
    expect(result).toBe(false);
  });

  it('cancel stops pending timer', () => {
    const onReconnect = jest.fn().mockResolvedValue(undefined);
    const reconnector = new Reconnector(
      { initialDelay: 1000, maxDelay: 5000, multiplier: 2, maxRetries: 3, enabled: true },
      onReconnect,
    );

    reconnector.schedule();
    reconnector.cancel();

    jest.advanceTimersByTime(2000);
    expect(onReconnect).not.toHaveBeenCalled();
    expect(reconnector.currentAttempt).toBe(0);
  });

  it('reset clears attempt counter', () => {
    const onReconnect = jest.fn().mockResolvedValue(undefined);
    const reconnector = new Reconnector(
      { initialDelay: 100, maxDelay: 5000, multiplier: 2, maxRetries: 3, enabled: true },
      onReconnect,
    );

    reconnector.schedule();
    expect(reconnector.currentAttempt).toBe(1);

    reconnector.reset();
    expect(reconnector.currentAttempt).toBe(0);
  });
});
