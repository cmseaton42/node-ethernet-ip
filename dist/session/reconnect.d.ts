/**
 * Auto-reconnect with exponential backoff.
 */
import { ReconnectOptions } from './types';
export declare class Reconnector {
    private readonly onReconnect;
    private attempt;
    private timer;
    private readonly options;
    constructor(options: Partial<ReconnectOptions> | undefined, onReconnect: (attempt: number) => Promise<void>);
    /** Schedule a reconnect attempt after backoff delay. Returns false if max retries exceeded. */
    schedule(): boolean;
    /** Reset attempt counter (call on successful connect) */
    reset(): void;
    /** Cancel any pending reconnect timer */
    cancel(): void;
    get currentAttempt(): number;
}
//# sourceMappingURL=reconnect.d.ts.map