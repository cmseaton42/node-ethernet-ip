/**
 * Session Manager — orchestrates the connection lifecycle.
 * Composes: register-session, forward-open, reconnect, state-machine
 */

import { TypedEventEmitter } from '@/util/typed-event-emitter';
import { StateMachine } from '@/util/state-machine';
import { ITransport } from '@/transport/interfaces';
import { RequestPipeline } from '@/pipeline/request-pipeline';
import { ConnectionError } from '@/errors';
import { ConnectionState, SessionEvents, ConnectOptions, DEFAULT_CONNECT_OPTIONS } from './types';
import { doRegisterSession, doUnregisterSession } from './register-session';
import { doForwardOpen, doForwardClose } from './forward-open';
import { Reconnector } from './reconnect';
import { Logger, noopLogger } from '@/util/logger';

const EIP_PORT = 44818;

export class SessionManager extends TypedEventEmitter<SessionEvents> {
  private sm = new StateMachine<ConnectionState>('disconnected', {
    '*': ['connecting', 'disconnected'],
    connecting: ['registering'],
    registering: ['forward-opening', 'connected'],
    'forward-opening': ['connected'],
    connected: ['disconnecting', 'reconnecting'],
  });
  private _sessionId = 0;
  private _connectionId = 0;
  private _connectionSize = 0;
  private _connectionSerial = 0;
  private _sequenceCount = 0;
  private _pipeline: RequestPipeline | null = null;
  private _options = DEFAULT_CONNECT_OPTIONS;
  private _reconnector: Reconnector | null = null;
  private _ip = '';

  constructor(
    private readonly transport: ITransport,
    readonly log: Logger = noopLogger,
  ) {
    super();
    this.sm.onStateChange((prev, current) => {
      this.log.debug('State transition', { from: prev, to: current });
      if (current !== 'reconnecting') {
        this.emit(current as keyof SessionEvents);
      }
    });
  }

  get state(): ConnectionState {
    return this.sm.state;
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
    // Clean up any previous session
    this._reconnector?.cancel();
    if (!this.sm.is('disconnected')) {
      this.cleanup();
      this.sm.setState('disconnected');
    }

    this._ip = ip;
    this._options = { ...DEFAULT_CONNECT_OPTIONS, ...options };

    // TCP connect
    this.sm.setState('connecting');
    this.log.info('Connecting', { ip, slot: this._options.slot });
    try {
      await this.transport.connect(ip, EIP_PORT, this._options.timeoutMs);
    } catch (err) {
      this.log.error('TCP connect failed', { ip, error: (err as Error).message });
      this.sm.setState('disconnected');
      throw new ConnectionError(`TCP connect failed: ${(err as Error).message}`);
    }

    this._pipeline = new RequestPipeline(this.transport);
    this.transport.onClose(() => this.handleClose());
    this.transport.onError((err) => {
      this.log.error('Transport error', { error: err.message });
      this.emit('error', err);
      if (!this.transport.connected) this.handleClose();
    });

    try {
      // Register Session
      this.sm.setState('registering');
      this._sessionId = await doRegisterSession(this._pipeline, this._options.timeoutMs);
      this.log.info('Session registered', { sessionId: this._sessionId });

      // Forward Open (connected messaging)
      if (this._options.connected) {
        this.sm.setState('forward-opening');
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
          this.log.info('Forward Open established', {
            connectionId: this._connectionId,
            connectionSize: this._connectionSize,
          });
        } catch (err) {
          this.log.error('Forward Open failed', { error: (err as Error).message });
          throw new ConnectionError(
            `Forward Open failed — the PLC rejected both Large and Small connection requests. ` +
              `Try connecting with { connected: false } to use unconnected messaging. ` +
              `Original error: ${(err as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.cleanup();
      this.sm.setState('disconnected');
      throw err;
    }

    this.sm.setState('connected');
    this.log.info('Connected', {
      ip,
      connected: this._options.connected,
      connectionSize: this._connectionSize,
    });
  }

  async disconnect(): Promise<void> {
    this._reconnector?.cancel();

    if (this.sm.is('disconnected') || this.sm.is('reconnecting')) {
      this.cleanup();
      if (!this.sm.is('disconnected')) this.sm.setState('disconnected');
      return;
    }

    this.sm.setState('disconnecting');

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
      this.sm.setState('disconnected');
      this.log.info('Disconnected');
    }
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
    if (this.sm.is('disconnecting')) return;
    if (this.sm.is('disconnected')) return;
    if (this.sm.is('reconnecting')) return;

    this.log.warn('Connection lost');
    this._pipeline?.flush(new ConnectionError('Transport closed'));
    this._pipeline = null;
    this._sessionId = 0;
    this._connectionId = 0;
    this._connectionSize = 0;
    this._sequenceCount = 0;

    if (this._options.reconnect.enabled) {
      this.sm.setState('reconnecting');
      this._reconnector = new Reconnector(this._options.reconnect, async (attempt) => {
        this.log.warn('Reconnect attempt', { attempt });
        this.emit('reconnecting', attempt);
        await this.connect(this._ip, this._options);
      });
      if (!this._reconnector.schedule()) {
        this.sm.setState('disconnected');
      }
    } else {
      this.sm.setState('disconnected');
    }
  }
}
