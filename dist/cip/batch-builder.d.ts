/**
 * Batch Builder — packs multiple CIP service requests into
 * Multi-Service Packet (0x0A) batches that fit within the
 * negotiated connection size.
 *
 * Tracks BOTH request and response sizes to avoid overflow.
 * Per CIP Vol 1, Appendix A-7 — Multiple Service Packet
 *
 * Request packet structure (connected):
 *   EIP Header (24) + InterfaceHandle (4) + Timeout (2) + CPF (varies)
 *   └─ Connected Data Item: SequenceCount (2) + CIP data
 *      └─ MR header: Service (1) + PathSize (1) + Path (4)
 *         └─ Multi-Service: Count (2) + Offsets (2×N) + ServiceData[]
 *
 * Response packet structure (connected):
 *   EIP Header (24) + InterfaceHandle (4) + Timeout (2) + CPF (varies)
 *   └─ Connected Data Item: SequenceCount (2) + CIP data
 *      └─ MR header: Service (1) + Reserved (1) + Status (1) + ExtSize (1)
 *         └─ Multi-Service: Count (2) + Offsets (2×N) + Replies[]
 *            └─ Each reply: Service (1) + Reserved (1) + Status (1) + ExtSize (1) + Data
 *
 * The connectionSize limits the Connected Data Item payload (seq + CIP).
 * For unconnected (UCMM), there is no sequence count — CIP data goes directly.
 */
import * as MessageRouter from './message-router';
export interface BatchRequest {
    /** Pre-built CIP service request (e.g. Read Tag message) */
    serviceData: Buffer;
    /** Estimated response size in bytes (from TYPE_SIZES) */
    estimatedResponseSize: number;
}
export interface Batch {
    /** The individual requests in this batch */
    requests: BatchRequest[];
    /** Assembled Multi-Service Packet ready to send */
    data: Buffer;
}
/**
 * Split an array of CIP service requests into optimally-packed
 * Multi-Service Packet batches.
 *
 * Accounts for all protocol overhead:
 *   Connected:   connectionSize ≥ seqCount(2) + MR(6) + multiSvc header + services
 *   Unconnected: connectionSize ≥ MR(6) + multiSvc header + services
 *
 * @param requests       - Individual CIP service requests with size estimates
 * @param connectionSize - Max packet size (4002 Large, 504 Small, 508 UCMM)
 * @param connected      - True for connected messaging (sequence count overhead)
 */
export declare function buildBatches(requests: BatchRequest[], connectionSize: number, connected: boolean): Batch[];
/**
 * Parse a Multi-Service Packet response into individual MR responses.
 *
 * Response layout (after MR header is stripped):
 *   [count(2), offset0(2), offset1(2), ..., reply0, reply1, ...]
 *
 * Offsets are relative to the count field.
 * Each reply is a standard Message Router response.
 */
export declare function parseMultiServiceResponse(data: Buffer): MessageRouter.MessageRouterResponse[];
//# sourceMappingURL=batch-builder.d.ts.map