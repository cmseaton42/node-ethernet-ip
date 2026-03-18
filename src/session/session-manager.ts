/**
 * Session Manager — orchestrates the connection lifecycle.
 * Composes: register-session, forward-open, reconnect
 */

import { TypedEventEmitter } from '@/util/typed-event-emitter';
import { ITransport } from '@/transport/interfaces';
import { RequestPipeline } from '@/pipeline/request-pipeline';
import { ConnectionError } from '@/errors';
import { ConnectionState, SessionEvents, ConnectOptions, DEFAULT_CONNECT_OPTIONS } from './types';
import { doRegisterSession, doUnregisterSession } from './register-session';
import { doForwardOpen, doForwardClose } from './forward-open';
import { Reconnector } from './reconnect';

const EIP_PORT = 44818;

export class SessionManager extends TypedEventEmitter<SessionEvents> {
  private _state = ConnectionState.Disconnected;
  private _sessionId = 0;
  private _connectionId = 0;
  private _connectionSize = 0;
  private _connectionSerial = 0;
  private _sequenceCount = 0;
  private _pipeline: RequestPipeline | null = null;
  private _options = DEFAULT_CONNECT_OPTIONS;
  private _reconnector: Reconnector | null = null;
  private _ip = '';

  constructor(private readonly transport: ITransport) {
    super();
  }

  get state(): ConnectionState {
    return this._state;
  }
  get sessionId(): number {
    return this._sessionId;
  }
  get connectionId(): number {
    return this._connectionId;
  }
  get connectionSize(): number {
    return this._connectionSize;
  }
  get pipeline(): RequestPipeline | null {
    return this._pipeline;
  }

  /** Get and increment the sequence counter for connected messaging. */
  nextSequence(): number {
    return this._sequenceCount++ & 0xffff;
  }

  async connect(ip: string, options: Partial<ConnectOptions> = {}): Promise<void> {
    this._ip = ip;
    this._options = { ...DEFAULT_CONNECT_OPTIONS, ...options };

    // TCP connect
    this.setState(ConnectionState.Connecting);
    try {
      await this.transport.connect(ip, EIP_PORT);
    } catch (err) {
      this.setState(ConnectionState.Disconnected);
      throw new ConnectionError(`TCP connect failed: ${(err as Error).message}`);
    }

    this._pipeline = new RequestPipeline(this.transport);
    this.transport.onClose(() => this.handleClose());
    this.transport.onError((err) => this.emit('error', err));

    try {
      // Register Session
      this.setState(ConnectionState.Registering);
      this._sessionId = await doRegisterSession(this._pipeline, this._options.timeoutMs);

      // Forward Open (connected messaging)
      if (this._options.connected) {
        this.setState(ConnectionState.ForwardOpening);
        try {
          const result = await doForwardOpen(
            this._pipeline,
            this._sessionId,
            this._options.slot,
            this._options.timeoutMs,
          );
          this._connectionId = result.connectionId;
          this._connectionSize = result.connectionSize;
          this._connectionSerial = result.connectionSerial;
        } catch (err) {
          throw new ConnectionError(
            `Forward Open failed — the PLC rejected both Large and Small connection requests. ` +
              `Try connecting with { connected: false } to use unconnected messaging. ` +
              `Original error: ${(err as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.cleanup();
      this.setState(ConnectionState.Disconnected);
      throw err;
    }

    this.setState(ConnectionState.Connected);
  }

  async disconnect(): Promise<void> {
    this._reconnector?.cancel();
    this.setState(ConnectionState.Disconnecting);

    try {
      if (this._pipeline && this._connectionSerial) {
        await doForwardClose(
          this._pipeline,
          this._sessionId,
          this._connectionSerial,
          this._options.timeoutMs,
        );
      }
      if (this._sessionId) {
        doUnregisterSession(this.transport, this._sessionId);
      }
    } finally {
      this.cleanup();
      this.setState(ConnectionState.Disconnected);
    }
  }

  private setState(state: ConnectionState): void {
    this._state = state;
    this.emit(state as keyof SessionEvents);
  }

  private cleanup(): void {
    this.transport.close();
    this._pipeline = null;
    this._sessionId = 0;
    this._connectionId = 0;
    this._connectionSize = 0;
    this._connectionSerial = 0;
    this._sequenceCount = 0;
  }

  private handleClose(): void {
    if (this._state === ConnectionState.Disconnecting) return;

    this._pipeline?.flush(new ConnectionError('Transport closed'));
    this._pipeline = null;
    this._sessionId = 0;
    this._connectionId = 0;
    this._connectionSize = 0;
    this._sequenceCount = 0;

    if (this._options.reconnect.enabled) {
      this.setState(ConnectionState.Reconnecting);
      this._reconnector = new Reconnector(this._options.reconnect, async (attempt) => {
        this.emit('reconnecting', attempt);
        await this.connect(this._ip, this._options);
      });
      if (!this._reconnector.schedule()) {
        this.setState(ConnectionState.Disconnected);
      }
    } else {
      this.setState(ConnectionState.Disconnected);
    }
  }
}
