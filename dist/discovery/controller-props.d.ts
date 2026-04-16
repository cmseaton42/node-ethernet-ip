/**
 * Controller properties — Get Attribute All on Identity Object.
 * Per CIP Vol 1, Chapter 5 — Identity Object (Class 0x01, Instance 0x01)
 */
import { ControllerProperties } from './types';
/** Build a Get Attribute All request for the Identity Object. */
export declare function buildGetControllerPropsRequest(): Buffer;
/**
 * Parse Identity Object response.
 * Layout: vendor(2), deviceType(2), productCode(2), major(1), minor(1),
 *         status(2), serialNumber(4), nameLength(1), name(N)
 */
export declare function parseControllerProps(data: Buffer): ControllerProperties;
//# sourceMappingURL=controller-props.d.ts.map