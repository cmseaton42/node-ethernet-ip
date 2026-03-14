import { EventEmitter } from 'events';

/**
 * Type-safe EventEmitter wrapper.
 *
 * Usage:
 *   interface MyEvents {
 *     data: (value: number) => void;
 *     error: (err: Error) => void;
 *   }
 *   class MyClass extends TypedEventEmitter<MyEvents> { ... }
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventMap = Record<string, (...args: any[]) => void>;

export class TypedEventEmitter<T extends EventMap> {
  private emitter = new EventEmitter();

  on<K extends keyof T & string>(event: K, listener: T[K]): this {
    this.emitter.on(event, listener);
    return this;
  }

  off<K extends keyof T & string>(event: K, listener: T[K]): this {
    this.emitter.off(event, listener);
    return this;
  }

  once<K extends keyof T & string>(event: K, listener: T[K]): this {
    this.emitter.once(event, listener);
    return this;
  }

  protected emit<K extends keyof T & string>(event: K, ...args: Parameters<T[K]>): boolean {
    return this.emitter.emit(event, ...args);
  }

  removeAllListeners<K extends keyof T & string>(event?: K): this {
    this.emitter.removeAllListeners(event);
    return this;
  }
}
