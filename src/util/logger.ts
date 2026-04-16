/**
 * Logger interface — injected via PLC constructor.
 * Default is noop (no output). Consumers provide their own implementation.
 */

export interface Logger {
  debug(msg: string, ctx?: Record<string, unknown>): void;
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
}

const noop = () => {};

export const noopLogger: Logger = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
};
