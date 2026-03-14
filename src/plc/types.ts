/**
 * PLC types and event definitions.
 */

import { ReconnectOptions, DEFAULT_RECONNECT } from '@/session/types';

export type TagValue = number | bigint | boolean | string | Buffer | TagValue[];

export type PLCEvents = {
  connected: () => void;
  disconnected: () => void;
  reconnecting: (attempt: number) => void;
  error: (err: Error) => void;
  tagChanged: (tag: string, value: TagValue, prev: TagValue) => void;
  tagInitialized: (tag: string, value: TagValue) => void;
};

export interface PLCConnectOptions {
  slot?: number;
  discover?: boolean;
  timeout?: number;
  autoReconnect?: boolean | ReconnectOptions;
}

export function resolveConnectOptions(opts: PLCConnectOptions = {}) {
  const reconnect: ReconnectOptions =
    typeof opts.autoReconnect === 'boolean'
      ? { ...DEFAULT_RECONNECT, enabled: opts.autoReconnect }
      : (opts.autoReconnect ?? DEFAULT_RECONNECT);

  return {
    slot: opts.slot ?? 0,
    discover: opts.discover ?? false,
    timeoutMs: opts.timeout ?? 10000,
    reconnect,
  };
}
