"use strict";
/**
 * Scanner — single scan group with subscribe/unsubscribe while running.
 *
 * All subscribed tags are read in one batch per cycle. The scan rate
 * is set at construction. Tags can be added/removed while scanning —
 * changes are picked up on the next tick.
 *
 * Usage:
 *   const scanner = new Scanner(readFn, { rate: 200 });
 *   scanner.subscribe('Temperature');
 *   scanner.on('tagChanged', (tag, value, prev) => { ... });
 *   scanner.scan();
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scanner = void 0;
const typed_event_emitter_1 = require("../util/typed-event-emitter");
const tick_timer_1 = require("../util/tick-timer");
const types_1 = require("./types");
class Scanner extends typed_event_emitter_1.TypedEventEmitter {
    constructor(readFn, options) {
        super();
        this.readFn = readFn;
        this.subscriptions = new Map();
        this.timer = null;
        this._scanning = false;
        this.rate = options?.rate ?? types_1.DEFAULT_SCAN_RATE;
        const logger = options?.logger;
        const interval = options?.metricsInterval ?? Math.ceil(types_1.METRICS_TARGET_MS / this.rate);
        this.metrics = new tick_timer_1.TickTimer(logger ? interval : 0, (m) => {
            logger?.debug('Scanner metrics', { ...m, tags: this.subscriptions.size, rateMs: this.rate });
        });
    }
    get scanning() {
        return this._scanning;
    }
    /** Subscribe a tag. Picked up on the next scan tick if already running. */
    subscribe(tagName) {
        const key = tagName.toLowerCase();
        if (!this.subscriptions.has(key)) {
            this.subscriptions.set(key, { tagName, lastValue: undefined });
        }
    }
    /** Remove a tag. Picked up on the next scan tick if already running. */
    unsubscribe(tagName) {
        this.subscriptions.delete(tagName.toLowerCase());
    }
    /** Start the scan loop. No-op if already scanning. */
    scan() {
        if (this._scanning)
            return;
        this._scanning = true;
        this.emit('scanStarted');
        this.scheduleTick();
    }
    /** Stop scanning. Subscriptions are preserved for resume via scan(). */
    pause() {
        if (!this._scanning)
            return;
        this._scanning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.metrics.reset();
        this.emit('scanStopped');
    }
    scheduleTick() {
        this.timer = setTimeout(() => this.tick(), this.rate);
    }
    async tick() {
        if (!this._scanning)
            return;
        this.metrics.tick();
        const start = Date.now();
        const subs = [...this.subscriptions.values()];
        if (subs.length > 0) {
            try {
                await this.readAndDetectChanges(subs);
            }
            catch (err) {
                this.emit('scanError', err);
            }
        }
        if (this._scanning) {
            const elapsed = Date.now() - start;
            this.timer = setTimeout(() => this.tick(), Math.max(0, this.rate - elapsed));
        }
    }
    async readAndDetectChanges(subs) {
        const tagNames = subs.map((s) => s.tagName);
        const values = await this.readFn(tagNames);
        for (let i = 0; i < subs.length; i++) {
            const sub = subs[i];
            // Skip if unsubscribed mid-read
            if (!this.subscriptions.has(sub.tagName.toLowerCase()))
                continue;
            const newValue = values[i];
            if (sub.lastValue === undefined) {
                sub.lastValue = newValue;
                this.emit('tagInitialized', sub.tagName, newValue);
            }
            else if (!valuesEqual(sub.lastValue, newValue)) {
                const prev = sub.lastValue;
                sub.lastValue = newValue;
                this.emit('tagChanged', sub.tagName, newValue, prev);
            }
        }
    }
}
exports.Scanner = Scanner;
/** Equality check — reference, Buffer content, or deep object comparison. */
function valuesEqual(a, b) {
    if (a === b)
        return true;
    if (Buffer.isBuffer(a) && Buffer.isBuffer(b))
        return a.equals(b);
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
        return JSON.stringify(a) === JSON.stringify(b);
    }
    return false;
}
//# sourceMappingURL=scanner.js.map