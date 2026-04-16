/**
 * CIP Connection Manager — Forward Open / Forward Close
 * Per CIP Vol 1, Chapter 3-5
 */
/** Redundant Owner — Vol 1, Table 3-5.8 Field 15 */
export declare const Owner: {
    readonly Exclusive: 0;
    readonly Multiple: 1;
};
/** Connection Type — Vol 1, Table 3-5.8 Fields 14-13 */
export declare const ConnectionType: {
    readonly Null: 0;
    readonly Multicast: 1;
    readonly PointToPoint: 2;
};
/** Priority — Vol 1, Table 3-5.8 Fields 11-10 */
export declare const Priority: {
    readonly Low: 0;
    readonly High: 1;
    readonly Scheduled: 2;
    readonly Urgent: 3;
};
/** Fixed/Variable — Vol 1, Table 3-5.8 Field 9 */
export declare const FixedVar: {
    readonly Fixed: 0;
    readonly Variable: 1;
};
/**
 * Encode network connection parameters into a 16-bit value.
 * Per CIP Vol 1, Table 3-5.8
 *
 * Bit layout:
 *   15:    Redundant Owner
 *   14-13: Connection Type
 *   12:    Reserved (0)
 *   11-10: Priority
 *   9:     Fixed/Variable
 *   8-0:   Connection Size
 */
export declare function encodeConnectionParams(owner: number, type: number, priority: number, fixedVar: number, size: number): number;
export interface ForwardOpenOptions {
    /** O→T and T→O RPI in microseconds (default 60000 = 60ms) */
    rpiMicroseconds?: number;
    /** Network connection parameters (use encodeConnectionParams) */
    connectionParams?: number;
    /** Timeout in ms for the connection (default 1000) */
    timeoutMs?: number;
    /** Timeout multiplier (4, 8, 16, 32, 64, 128, 256, 512) */
    timeoutMultiplier?: number;
    /** Connection serial number */
    connectionSerial?: number;
    /** T→O connection ID (random if not provided) */
    toConnectionId?: number;
    /** Originator vendor ID */
    vendorId?: number;
    /** Originator serial number */
    originatorSerial?: number;
}
/**
 * Build the data portion of a Forward Open request.
 * Per CIP Vol 1, Table 3-5.16 (Small Forward Open)
 *
 * Layout (35 bytes):
 *   [timeTick(1), ticks(1),
 *    otConnId(4), toConnId(4),
 *    connSerial(2), vendorId(2), originatorSerial(4),
 *    timeoutMultiplier(4),
 *    otRPI(4), otParams(2),
 *    toRPI(4), toParams(2),
 *    transportTrigger(1)]
 */
export declare function buildForwardOpenData(opts?: ForwardOpenOptions): Buffer;
/**
 * Build the data portion of a Large Forward Open request.
 * Per CIP Vol 1, Table 3-5.16 (Large Forward Open)
 *
 * Same as Forward Open but connection params are 32-bit instead of 16-bit.
 * Layout (39 bytes).
 */
export declare function buildLargeForwardOpenData(opts?: ForwardOpenOptions): Buffer;
export interface ForwardCloseOptions {
    timeoutMs?: number;
    connectionSerial: number;
    vendorId?: number;
    originatorSerial?: number;
}
/**
 * Build the data portion of a Forward Close request.
 * Per CIP Vol 1, Table 3-5.22
 *
 * Layout (10 bytes):
 *   [timeTick(1), ticks(1), connSerial(2), vendorId(2), originatorSerial(4)]
 */
export declare function buildForwardCloseData(opts: ForwardCloseOptions): Buffer;
//# sourceMappingURL=connection-manager.d.ts.map