"use strict";
/**
 * Session Manager — orchestrates the connection lifecycle.
 * Composes: register-session, forward-open, reconnect, state-machine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
const typed_event_emitter_1 = require("../util/typed-event-emitter");
const state_machine_1 = require("../util/state-machine");
const request_pipeline_1 = require("../pipeline/request-pipeline");
const errors_1 = require("../errors");
const types_1 = require("./types");
const register_session_1 = require("./register-session");
const forward_open_1 = require("./forward-open");
const reconnect_1 = require("./reconnect");
const logger_1 = require("../util/logger");
const EIP_PORT = 44818;
class SessionManager extends typed_event_emitter_1.TypedEventEmitter {
    constructor(transport, log = logger_1.noopLogger) {
        super();
        this.transport = transport;
        this.log = log;
        this.sm = new state_machine_1.StateMachine('disconnected', {
            exits: {
                connecting: ['registering'],
                registering: ['forward-opening', 'connected'],
                'forward-opening': ['connected'],
                connected: ['disconnecting', 'reconnecting'],
            },
            entries: {
                connecting: '*',
                disconnected: '*',
            },
        });
        this._sessionId = 0;
        this._connectionId = 0;
        this._connectionSize = 0;
        this._connectionSerial = 0;
        this._sequenceCount = 0;
        this._pipeline = null;
        this._options = types_1.DEFAULT_CONNECT_OPTIONS;
        this._reconnector = null;
        this._ip = '';
        this.sm.onStateChange((prev, current) => {
            this.log.debug('State transition', { from: prev, to: current });
            if (current !== 'reconnecting') {
                this.emit(current);
            }
        });
    }
    get state() {
        return this.sm.state;
    }
    get sessionId() {
        return this._sessionId;
    }
    get connectionId() {
        return this._connectionId;
    }
    get connectionSize() {
        return this._connectionSize;
    }
    get pipeline() {
        return this._pipeline;
    }
    /** Get and increment the sequence counter for connected messaging. */
    nextSequence() {
        return this._sequenceCount++ & 0xffff;
    }
    async connect(ip, options = {}) {
        // Clean up any previous session
        this._reconnector?.cancel();
        if (!this.sm.is('disconnected')) {
            this.cleanup();
            this.sm.setState('disconnected');
        }
        this._ip = ip;
        this._options = { ...types_1.DEFAULT_CONNECT_OPTIONS, ...options };
        // TCP connect
        this.sm.setState('connecting');
        this.log.info('Connecting', { ip, slot: this._options.slot });
        try {
            await this.transport.connect(ip, EIP_PORT, this._options.timeoutMs);
        }
        catch (err) {
            this.log.error('TCP connect failed', { ip, error: err.message });
            this.sm.setState('disconnected');
            throw new errors_1.ConnectionError(`TCP connect failed: ${err.message}`);
        }
        this._pipeline = new request_pipeline_1.RequestPipeline(this.transport);
        this.transport.onClose(() => this.handleClose());
        this.transport.onError((err) => {
            this.log.error('Transport error', { error: err.message });
            this.emit('error', err);
            if (!this.transport.connected)
                this.handleClose();
        });
        try {
            // Register Session
            this.sm.setState('registering');
            this._sessionId = await (0, register_session_1.doRegisterSession)(this._pipeline, this._options.timeoutMs);
            this.log.info('Session registered', { sessionId: this._sessionId });
            // Forward Open (connected messaging)
            if (this._options.connected) {
                this.sm.setState('forward-opening');
                try {
                    const result = await (0, forward_open_1.doForwardOpen)(this._pipeline, this._sessionId, this._options.slot, this._options.timeoutMs);
                    this._connectionId = result.connectionId;
                    this._connectionSize = result.connectionSize;
                    this._connectionSerial = result.connectionSerial;
                    this.log.info('Forward Open established', {
                        connectionId: this._connectionId,
                        connectionSize: this._connectionSize,
                    });
                }
                catch (err) {
                    this.log.error('Forward Open failed', { error: err.message });
                    throw new errors_1.ConnectionError(`Forward Open failed — the PLC rejected both Large and Small connection requests. ` +
                        `Try connecting with { connected: false } to use unconnected messaging. ` +
                        `Original error: ${err.message}`);
                }
            }
        }
        catch (err) {
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
    async disconnect() {
        this._reconnector?.cancel();
        if (this.sm.is('disconnected') || this.sm.is('reconnecting')) {
            this.cleanup();
            if (!this.sm.is('disconnected'))
                this.sm.setState('disconnected');
            return;
        }
        this.sm.setState('disconnecting');
        try {
            if (this._pipeline && this._connectionSerial) {
                await (0, forward_open_1.doForwardClose)(this._pipeline, this._sessionId, this._connectionSerial, this._options.timeoutMs);
            }
            if (this._sessionId) {
                (0, register_session_1.doUnregisterSession)(this.transport, this._sessionId);
            }
        }
        finally {
            this.cleanup();
            this.sm.setState('disconnected');
            this.log.info('Disconnected');
        }
    }
    cleanup() {
        this.transport.close();
        this._pipeline = null;
        this._sessionId = 0;
        this._connectionId = 0;
        this._connectionSize = 0;
        this._connectionSerial = 0;
        this._sequenceCount = 0;
    }
    handleClose() {
        if (this.sm.is('disconnecting'))
            return;
        if (this.sm.is('disconnected'))
            return;
        if (this.sm.is('reconnecting'))
            return;
        this.log.warn('Connection lost');
        this._pipeline?.flush(new errors_1.ConnectionError('Transport closed'));
        this._pipeline = null;
        this._sessionId = 0;
        this._connectionId = 0;
        this._connectionSize = 0;
        this._sequenceCount = 0;
        if (this._options.reconnect.enabled) {
            this.sm.setState('reconnecting');
            this._reconnector = new reconnect_1.Reconnector(this._options.reconnect, async (attempt) => {
                this.log.warn('Reconnect attempt', { attempt });
                this.emit('reconnecting', attempt);
                await this.connect(this._ip, this._options);
            });
            if (!this._reconnector.schedule()) {
                this.sm.setState('disconnected');
            }
        }
        else {
            this.sm.setState('disconnected');
        }
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=session-manager.js.map