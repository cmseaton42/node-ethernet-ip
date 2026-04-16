"use strict";
/**
 * Register / Unregister EIP Session.
 * Per CIP Vol 2, Section 2-4.7 and 2-4.8
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.doRegisterSession = doRegisterSession;
exports.doUnregisterSession = doUnregisterSession;
const header_1 = require("../encapsulation/header");
const encapsulation_1 = require("../encapsulation/encapsulation");
const errors_1 = require("../errors");
/**
 * Send RegisterSession and return the session ID.
 */
async function doRegisterSession(pipeline, timeoutMs) {
    const request = (0, encapsulation_1.registerSession)();
    const response = await pipeline.send(request, timeoutMs);
    const parsed = (0, header_1.parseHeader)(response);
    if (parsed.statusCode !== 0) {
        throw new errors_1.SessionError(`Register session failed: ${parsed.status}`, parsed.statusCode);
    }
    return parsed.session;
}
/**
 * Send UnregisterSession (fire-and-forget, no response expected).
 */
function doUnregisterSession(transport, sessionId) {
    transport.write((0, encapsulation_1.unregisterSession)(sessionId));
}
//# sourceMappingURL=register-session.js.map