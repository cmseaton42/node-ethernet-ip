/**
 * CIP Unconnected Send (UCMM wrapper)
 * Per CIP Vol 1, Section 3-5.5.3
 *
 * Wraps a CIP message request for routing through the Connection Manager
 * (Class 0x06, Instance 0x01) to a target device.
 *
 * Layout:
 *   [timeTick(1), timeoutTicks(1), msgLength(2), message(N),
 *    pad?(1), routePathSize(1), reserved(1), routePath(M)]
 */
export interface EncodedTimeout {
    timeTick: number;
    ticks: number;
}
/**
 * Encode a timeout in milliseconds to CIP time_tick + ticks format.
 * Per CIP Vol 1, Section 3-5.4.1.3
 *
 * Actual timeout = 2^timeTick * ticks (ms)
 * Searches for the closest match.
 */
export declare function encodeTimeout(timeoutMs: number): EncodedTimeout;
/**
 * Build an Unconnected Send packet.
 *
 * @param messageRequest - The CIP message to wrap
 * @param routePath      - EPATH to the target (e.g. backplane port + slot)
 * @param timeoutMs      - Timeout in milliseconds (default 2000)
 */
export declare function build(messageRequest: Buffer, routePath: Buffer, timeoutMs?: number): Buffer;
//# sourceMappingURL=unconnected-send.d.ts.map