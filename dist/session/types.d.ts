/**
 * Connection state machine and types for the Session Manager.
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'registering' | 'forward-opening' | 'connected' | 'disconnecting' | 'reconnecting';
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
export declare const DEFAULT_RECONNECT: ReconnectOptions;
export interface ConnectOptions {
    slot: number;
    timeoutMs: number;
    connected: boolean;
    reconnect: ReconnectOptions;
}
export declare const DEFAULT_CONNECT_OPTIONS: ConnectOptions;
//# sourceMappingURL=types.d.ts.map