/**
 * CIP Service Codes
 * Per CIP Vol 1, Appendix A
 *
 * Note: FORWARD_CLOSE (0x4E) and READ_MODIFY_WRITE_TAG (0x4E) share
 * the same code — they target different CIP objects (Connection Manager
 * vs Tag). Using a const object instead of enum to allow this.
 */
export declare const CIPService: {
    readonly GET_ATTRIBUTE_ALL: 1;
    readonly GET_ATTRIBUTES: 3;
    readonly RESET: 5;
    readonly START: 6;
    readonly STOP: 7;
    readonly CREATE: 8;
    readonly DELETE: 9;
    readonly MULTIPLE_SERVICE_PACKET: 10;
    readonly APPLY_ATTRIBUTES: 13;
    readonly GET_ATTRIBUTE_SINGLE: 14;
    readonly SET_ATTRIBUTE_SINGLE: 16;
    readonly FIND_NEXT: 17;
    readonly READ_TAG: 76;
    readonly WRITE_TAG: 77;
    readonly READ_MODIFY_WRITE_TAG: 78;
    readonly GET_FILE_DATA: 79;
    readonly READ_TAG_FRAGMENTED: 82;
    readonly WRITE_TAG_FRAGMENTED: 83;
    readonly UNCONNECTED_SEND: 82;
    readonly FORWARD_CLOSE: 78;
    readonly FORWARD_OPEN: 84;
    readonly LARGE_FORWARD_OPEN: 91;
    readonly GET_INSTANCE_ATTRIBUTE_LIST: 85;
};
/** Reply service flag — OR'd with request service code in responses */
export declare const REPLY_FLAG = 128;
//# sourceMappingURL=services.d.ts.map