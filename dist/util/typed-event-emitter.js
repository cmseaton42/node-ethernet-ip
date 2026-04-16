"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypedEventEmitter = void 0;
const events_1 = require("events");
class TypedEventEmitter {
    constructor() {
        this.emitter = new events_1.EventEmitter();
    }
    on(event, listener) {
        this.emitter.on(event, listener);
        return this;
    }
    off(event, listener) {
        this.emitter.off(event, listener);
        return this;
    }
    once(event, listener) {
        this.emitter.once(event, listener);
        return this;
    }
    emit(event, ...args) {
        return this.emitter.emit(event, ...args);
    }
    removeAllListeners(event) {
        if (event) {
            this.emitter.removeAllListeners(event);
        }
        else {
            this.emitter.removeAllListeners();
        }
        return this;
    }
}
exports.TypedEventEmitter = TypedEventEmitter;
//# sourceMappingURL=typed-event-emitter.js.map