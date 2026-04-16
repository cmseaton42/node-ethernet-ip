"use strict";
/**
 * Logger interface — injected via PLC constructor.
 * Default is noop (no output). Consumers provide their own implementation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.noopLogger = void 0;
const noop = () => { };
exports.noopLogger = {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
};
//# sourceMappingURL=logger.js.map