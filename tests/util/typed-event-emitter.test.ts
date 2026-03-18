import { TypedEventEmitter } from '@/util/typed-event-emitter';

interface TestEvents {
  data: (value: number) => void;
  error: (err: Error) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class TestEmitter extends TypedEventEmitter<TestEvents & Record<string, (...args: any[]) => void>> {
  doEmit<K extends keyof TestEvents & string>(event: K, ...args: Parameters<TestEvents[K]>) {
    return this.emit(event, ...args);
  }
}

describe('TypedEventEmitter', () => {
  it('on/emit works', () => {
    const emitter = new TestEmitter();
    const fn = jest.fn();
    emitter.on('data', fn);
    emitter.doEmit('data', 42);
    expect(fn).toHaveBeenCalledWith(42);
  });

  it('off removes listener', () => {
    const emitter = new TestEmitter();
    const fn = jest.fn();
    emitter.on('data', fn);
    emitter.off('data', fn);
    emitter.doEmit('data', 1);
    expect(fn).not.toHaveBeenCalled();
  });

  it('once fires only once', () => {
    const emitter = new TestEmitter();
    const fn = jest.fn();
    emitter.once('data', fn);
    emitter.doEmit('data', 1);
    emitter.doEmit('data', 2);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('removeAllListeners clears all for a given event', () => {
    const emitter = new TestEmitter();
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    emitter.on('data', fn1);
    emitter.on('data', fn2);
    emitter.removeAllListeners('data');
    emitter.doEmit('data', 1);
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });

  it('removeAllListeners with no arg clears all events', () => {
    const emitter = new TestEmitter();
    const dataFn = jest.fn();
    emitter.on('data', dataFn);
    emitter.removeAllListeners();
    emitter.doEmit('data', 1);
    expect(dataFn).not.toHaveBeenCalled();
  });

  it('on returns this for chaining', () => {
    const emitter = new TestEmitter();
    const result = emitter.on('data', () => {});
    expect(result).toBe(emitter);
  });

  it('off returns this for chaining', () => {
    const emitter = new TestEmitter();
    const fn = () => {};
    emitter.on('data', fn);
    expect(emitter.off('data', fn)).toBe(emitter);
  });

  it('emit returns false when no listeners', () => {
    const emitter = new TestEmitter();
    expect(emitter.doEmit('data', 1)).toBe(false);
  });

  it('emit returns true when listeners exist', () => {
    const emitter = new TestEmitter();
    emitter.on('data', () => {});
    expect(emitter.doEmit('data', 1)).toBe(true);
  });
});
