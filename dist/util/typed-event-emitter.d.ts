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
type EventMap = Record<string, (...args: any[]) => void>;
export declare class TypedEventEmitter<T extends EventMap> {
    private emitter;
    on<K extends keyof T & string>(event: K, listener: T[K]): this;
    off<K extends keyof T & string>(event: K, listener: T[K]): this;
    once<K extends keyof T & string>(event: K, listener: T[K]): this;
    protected emit<K extends keyof T & string>(event: K, ...args: Parameters<T[K]>): boolean;
    removeAllListeners<K extends keyof T & string>(event?: K): this;
}
export {};
//# sourceMappingURL=typed-event-emitter.d.ts.map