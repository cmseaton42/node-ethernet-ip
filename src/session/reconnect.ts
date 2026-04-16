/**
 * Auto-reconnect with exponential backoff.
 */

import { ReconnectOptions, DEFAULT_RECONNECT } from './types';

export class Reconnector {
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly options: ReconnectOptions;

  constructor(
    options: Partial<ReconnectOptions> = {},
    private readonly onReconnect: (attempt: number) => Promise<void>,
  ) {
    this.options = { ...DEFAULT_RECONNECT, ...options, enabled: true };
  }

  /** Schedule a reconnect attempt after backoff delay. Returns false if max retries exceeded. */
  schedule(): boolean {
    if (this.attempt >= this.options.maxRetries) return false;

    const { initialDelay, maxDelay, multiplier } = this.options;
    const delay = Math.min(initialDelay * Math.pow(multiplier, this.attempt), maxDelay);
    this.attempt++;

    this.timer = setTimeout(async () => {
      try {
        await this.onReconnect(this.attempt);
        this.reset();
      } catch {
        this.schedule();
      }
    }, delay);

    return true;
  }

  /** Reset attempt counter (call on successful connect) */
  reset(): void {
    this.attempt = 0;
  }

  /** Cancel any pending reconnect timer */
  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.attempt = 0;
  }

  get currentAttempt(): number {
    return this.attempt;
  }
}
