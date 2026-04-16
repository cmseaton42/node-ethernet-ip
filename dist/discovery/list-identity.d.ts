/**
 * UDP device discovery — ListIdentity broadcast.
 * Per CIP Vol 2, Section 2-4.3
 */
import { Device } from './types';
/** Build a ListIdentity request packet. */
export declare function buildListIdentityRequest(): Buffer;
/**
 * Parse a ListIdentity response into a Device.
 * Response CPF item data layout:
 *   encapVersion(2), sinFamily(2), sinPort(2), sinAddr(4),
 *   sinZero(8), vendorId(2), deviceType(2), productCode(2),
 *   revision(2), status(2), serialNumber(4), nameLength(1), name(N), state(1)
 */
export declare function parseListIdentityResponse(data: Buffer, offset?: number): Device;
//# sourceMappingURL=list-identity.d.ts.map