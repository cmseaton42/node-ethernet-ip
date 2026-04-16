/**
 * Connection state machine and types for the Session Manager.
 */

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'registering'
  | 'forward-opening'
  | 'connected'
  | 'disconnecting'
  | 'reconnecting';

export type SessionEvents = {
  connecting: () => void;
  registering: () => void;
  'forward-opening': () => void;
  connected: () => void;
  disconnecting: () => void;
  disconnected: () => void;
  reconnecting: (attempt: number) => void;
  error: (err: Error) => void;
};

export interface ReconnectOptions {
  enabled: boolean;
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
  maxRetries: number;
}

export const DEFAULT_RECONNECT: ReconnectOptions = {
  enabled: false,
  initialDelay: 1000,
  maxDelay: 10000,
  multiplier: 2,
  maxRetries: Infinity,
};

export interface ConnectOptions {
  slot: number;
  timeoutMs: number;
  connected: boolean;
  reconnect: ReconnectOptions;
}

export const DEFAULT_CONNECT_OPTIONS: ConnectOptions = {
  slot: 0,
  timeoutMs: 10000,
  connected: true,
  reconnect: DEFAULT_RECONNECT,
};
