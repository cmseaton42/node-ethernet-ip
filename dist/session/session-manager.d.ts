/**
 * Session Manager — orchestrates the connection lifecycle.
 * Composes: register-session, forward-open, reconnect, state-machine
 */
import { TypedEventEmitter } from '../util/typed-event-emitter';
import { ITransport } from '../transport/interfaces';
import { RequestPipeline } from '../pipeline/request-pipeline';
import { ConnectionState, SessionEvents, ConnectOptions } from './types';
import { Logger } from '../util/logger';
export declare class SessionManager extends TypedEventEmitter<SessionEvents> {
    private readonly transport;
    readonly log: Logger;
    private sm;
    private _sessionId;
    private _connectionId;
    private _connectionSize;
    private _connectionSerial;
    private _sequenceCount;
    private _pipeline;
    private _options;
    private _reconnector;
    private _ip;
    constructor(transport: ITransport, log?: Logger);
    get state(): ConnectionState;
    get sessionId(): number;
    get connectionId(): number;
    get connectionSize(): number;
    get pipeline(): RequestPipeline | null;
    /** Get and increment the sequence counter for connected messaging. */
    nextSequence(): number;
    connect(ip: string, options?: Partial<ConnectOptions>): Promise<void>;
    disconnect(): Promise<void>;
    private cleanup;
    private handleClose;
}
//# sourceMappingURL=session-manager.d.ts.map