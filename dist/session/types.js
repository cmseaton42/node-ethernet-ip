"use strict";
/**
 * Connection state machine and types for the Session Manager.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONNECT_OPTIONS = exports.DEFAULT_RECONNECT = void 0;
exports.DEFAULT_RECONNECT = {
    enabled: false,
    initialDelay: 1000,
    maxDelay: 10000,
    multiplier: 2,
    maxRetries: Infinity,
};
exports.DEFAULT_CONNECT_OPTIONS = {
    slot: 0,
    timeoutMs: 10000,
    connected: true,
    reconnect: exports.DEFAULT_RECONNECT,
};
//# sourceMappingURL=types.js.map