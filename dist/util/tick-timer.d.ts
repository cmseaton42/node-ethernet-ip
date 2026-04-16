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
export declare class TickTimer {
    private readonly interval;
    private readonly onFlush;
    private lastTick;
    private ticks;
    private totalMs;
    private maxMs;
    private minMs;
    constructor(interval: number, onFlush: (metrics: TickMetrics) => void);
    tick(now?: number): void;
    reset(): void;
}
//# sourceMappingURL=tick-timer.d.ts.map