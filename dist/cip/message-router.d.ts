/**
 * CIP Message Router — build requests and parse responses.
 * Per CIP Vol 1, Chapter 2
 *
 * Request:
 *   [service(1), pathSize(1), path(N), data(M)]
 *
 * Response:
 *   [service|0x80(1), reserved(1), status(1), extStatusSize(1), extStatus(K), data(M)]
 */
export interface MessageRouterResponse {
    service: number;
    generalStatusCode: number;
    extendedStatusLength: number;
    extendedStatus: number[];
    data: Buffer;
}
/**
 * Build a Message Router request.
 *
 * @param service - CIP service code
 * @param path    - Padded EPATH (from EPathBuilder)
 * @param data    - Service-specific request data
 */
export declare function build(service: number, path: Buffer, data?: Buffer): Buffer;
/**
 * Parse a Message Router response.
 */
export declare function parse(buf: Buffer): MessageRouterResponse;
//# sourceMappingURL=message-router.d.ts.map