/**
 * TickTimer — measures intervals between consecutive tick() calls
 * and reports summary metrics via a callback at a configurable interval.
 */

export interface TickMetrics {
  ticks: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
}

export class TickTimer {
  private lastTick: number | undefined;
  private ticks = 0;
  private totalMs = 0;
  private maxMs = 0;
  private minMs = Infinity;

  constructor(
    private readonly interval: number,
    private readonly onFlush: (metrics: TickMetrics) => void,
  ) {}

  tick(now = Date.now()): void {
    if (this.lastTick !== undefined) {
      const delta = now - this.lastTick;
      this.ticks++;
      this.totalMs += delta;
      if (delta > this.maxMs) this.maxMs = delta;
      if (delta < this.minMs) this.minMs = delta;

      if (this.interval > 0 && this.ticks >= this.interval) {
        this.onFlush({
          ticks: this.ticks,
          avgMs: Math.round(this.totalMs / this.ticks),
          minMs: this.minMs,
          maxMs: this.maxMs,
        });
        this.ticks = 0;
        this.totalMs = 0;
        this.maxMs = 0;
        this.minMs = Infinity;
      }
    }
    this.lastTick = now;
  }

  reset(): void {
    this.lastTick = undefined;
    this.ticks = 0;
    this.totalMs = 0;
    this.maxMs = 0;
    this.minMs = Infinity;
  }
}
