"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockTransport = void 0;
class MockTransport {
    constructor() {
        this.sentData = [];
        this.connected = false;
        this.dataHandler = null;
        this.closeHandler = null;
        this.errorHandler = null;
    }
    connect(_host, _port, _timeoutMs) {
        this.connected = true;
        return Promise.resolve();
    }
    write(data) {
        this.sentData.push(data);
    }
    onData(handler) {
        this.dataHandler = handler;
    }
    onClose(handler) {
        this.closeHandler = handler;
    }
    onError(handler) {
        this.errorHandler = handler;
    }
    close() {
        this.connected = false;
        this.closeHandler?.(false);
    }
    injectResponse(data) {
        this.dataHandler?.(data);
    }
    triggerClose(hadError = false) {
        this.closeHandler?.(hadError);
    }
    triggerError(err) {
        this.errorHandler?.(err);
    }
    reset() {
        this.sentData = [];
        this.dataHandler = null;
        this.closeHandler = null;
        this.errorHandler = null;
    }
}
exports.MockTransport = MockTransport;
//# sourceMappingURL=mock-transport.js.map