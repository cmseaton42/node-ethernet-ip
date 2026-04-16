"use strict";
/**
 * PLC types and event definitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveConnectOptions = resolveConnectOptions;
const types_1 = require("../session/types");
function resolveConnectOptions(opts = {}) {
    const reconnect = typeof opts.autoReconnect === 'boolean'
        ? { ...types_1.DEFAULT_RECONNECT, enabled: opts.autoReconnect }
        : (opts.autoReconnect ?? types_1.DEFAULT_RECONNECT);
    return {
        slot: opts.slot ?? 0,
        discover: opts.discover ?? false,
        timeoutMs: opts.timeout ?? 10000,
        connected: opts.connected ?? true,
        reconnect,
    };
}
//# sourceMappingURL=types.js.map