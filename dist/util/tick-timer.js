"use strict";
/**
 * TickTimer — measures intervals between consecutive tick() calls
 * and reports summary metrics via a callback at a configurable interval.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TickTimer = void 0;
class TickTimer {
    constructor(interval, onFlush) {
        this.interval = interval;
        this.onFlush = onFlush;
        this.ticks = 0;
        this.totalMs = 0;
        this.maxMs = 0;
        this.minMs = Infinity;
    }
    tick(now = Date.now()) {
        if (this.lastTick !== undefined) {
            const delta = now - this.lastTick;
            this.ticks++;
            this.totalMs += delta;
            if (delta > this.maxMs)
                this.maxMs = delta;
            if (delta < this.minMs)
                this.minMs = delta;
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
    reset() {
        this.lastTick = undefined;
        this.ticks = 0;
        this.totalMs = 0;
        this.maxMs = 0;
        this.minMs = Infinity;
    }
}
exports.TickTimer = TickTimer;
//# sourceMappingURL=tick-timer.js.map