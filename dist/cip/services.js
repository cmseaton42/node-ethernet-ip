"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPLY_FLAG = exports.CIPService = void 0;
/**
 * CIP Service Codes
 * Per CIP Vol 1, Appendix A
 *
 * Note: FORWARD_CLOSE (0x4E) and READ_MODIFY_WRITE_TAG (0x4E) share
 * the same code — they target different CIP objects (Connection Manager
 * vs Tag). Using a const object instead of enum to allow this.
 */
exports.CIPService = {
    // General CIP object services
    GET_ATTRIBUTE_ALL: 0x01,
    GET_ATTRIBUTES: 0x03,
    RESET: 0x05,
    START: 0x06,
    STOP: 0x07,
    CREATE: 0x08,
    DELETE: 0x09,
    MULTIPLE_SERVICE_PACKET: 0x0a,
    APPLY_ATTRIBUTES: 0x0d,
    GET_ATTRIBUTE_SINGLE: 0x0e,
    SET_ATTRIBUTE_SINGLE: 0x10,
    FIND_NEXT: 0x11,
    // Tag services (Logix-specific)
    READ_TAG: 0x4c,
    WRITE_TAG: 0x4d,
    READ_MODIFY_WRITE_TAG: 0x4e,
    GET_FILE_DATA: 0x4f,
    READ_TAG_FRAGMENTED: 0x52,
    WRITE_TAG_FRAGMENTED: 0x53,
    // Connection Manager services
    UNCONNECTED_SEND: 0x52,
    FORWARD_CLOSE: 0x4e,
    FORWARD_OPEN: 0x54,
    LARGE_FORWARD_OPEN: 0x5b,
    // Discovery services
    GET_INSTANCE_ATTRIBUTE_LIST: 0x55,
};
/** Reply service flag — OR'd with request service code in responses */
exports.REPLY_FLAG = 0x80;
//# sourceMappingURL=services.js.map