"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FragmentationError = exports.TypeMismatchError = exports.TagNotFoundError = exports.CIPError = exports.TimeoutError = exports.ForwardOpenError = exports.SessionError = exports.ConnectionError = exports.EIPError = void 0;
const cip_status_codes_1 = require("./cip-status-codes");
/** Base error for all EtherNet/IP errors */
class EIPError extends Error {
    constructor(message, code = 0, context = {}) {
        super(message);
        this.code = code;
        this.context = context;
        this.name = 'EIPError';
    }
}
exports.EIPError = EIPError;
/** TCP connection failure */
class ConnectionError extends EIPError {
    constructor(message, context = {}) {
        super(message, 0, context);
        this.name = 'ConnectionError';
    }
}
exports.ConnectionError = ConnectionError;
/** Session registration failure */
class SessionError extends EIPError {
    constructor(message, code = 0, context = {}) {
        super(message, code, context);
        this.name = 'SessionError';
    }
}
exports.SessionError = SessionError;
/** Forward Open rejected */
class ForwardOpenError extends EIPError {
    constructor(message, rejectionReason = 0, context = {}) {
        super(message, rejectionReason, context);
        this.rejectionReason = rejectionReason;
        this.name = 'ForwardOpenError';
    }
}
exports.ForwardOpenError = ForwardOpenError;
/** Request/response timeout */
class TimeoutError extends EIPError {
    constructor(message, duration, context = {}) {
        super(message, 0, context);
        this.duration = duration;
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
/** CIP general status error */
class CIPError extends EIPError {
    constructor(generalStatusCode, extendedStatus = [], context = {}) {
        const statusMsg = (0, cip_status_codes_1.getStatusMessage)(generalStatusCode);
        super(`CIP Error: ${statusMsg}`, generalStatusCode, context);
        this.generalStatusCode = generalStatusCode;
        this.extendedStatus = extendedStatus;
        this.statusMessage = statusMsg;
        this.name = 'CIPError';
    }
}
exports.CIPError = CIPError;
/** Tag path could not be resolved (CIP status 0x05) */
class TagNotFoundError extends CIPError {
    constructor(tagName, extendedStatus = []) {
        super(0x05, extendedStatus, { tagName });
        this.name = 'TagNotFoundError';
    }
}
exports.TagNotFoundError = TagNotFoundError;
/** Write value doesn't match tag type */
class TypeMismatchError extends EIPError {
    constructor(tagName, expectedType, actualType) {
        super(`Type mismatch for "${tagName}": expected ${expectedType}, got ${actualType}`, 0, {
            tagName,
            expectedType,
            actualType,
        });
        this.name = 'TypeMismatchError';
    }
}
exports.TypeMismatchError = TypeMismatchError;
/** Fragmented transfer failure */
class FragmentationError extends EIPError {
    constructor(message, context = {}) {
        super(message, 0, context);
        this.name = 'FragmentationError';
    }
}
exports.FragmentationError = FragmentationError;
//# sourceMappingURL=errors.js.map