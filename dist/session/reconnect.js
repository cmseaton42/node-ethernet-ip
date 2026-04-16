"use strict";
/**
 * Auto-reconnect with exponential backoff.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reconnector = void 0;
const types_1 = require("./types");
class Reconnector {
    constructor(options = {}, onReconnect) {
        this.onReconnect = onReconnect;
        this.attempt = 0;
        this.timer = null;
        this.options = { ...types_1.DEFAULT_RECONNECT, ...options, enabled: true };
    }
    /** Schedule a reconnect attempt after backoff delay. Returns false if max retries exceeded. */
    schedule() {
        if (this.attempt >= this.options.maxRetries)
            return false;
        const { initialDelay, maxDelay, multiplier } = this.options;
        const delay = Math.min(initialDelay * Math.pow(multiplier, this.attempt), maxDelay);
        this.attempt++;
        this.timer = setTimeout(async () => {
            try {
                await this.onReconnect(this.attempt);
                this.reset();
            }
            catch {
                this.schedule();
            }
        }, delay);
        return true;
    }
    /** Reset attempt counter (call on successful connect) */
    reset() {
        this.attempt = 0;
    }
    /** Cancel any pending reconnect timer */
    cancel() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.attempt = 0;
    }
    get currentAttempt() {
        return this.attempt;
    }
}
exports.Reconnector = Reconnector;
//# sourceMappingURL=reconnect.js.map