/** Base error for all EtherNet/IP errors */
export declare class EIPError extends Error {
    readonly code: number;
    readonly context: Record<string, unknown>;
    constructor(message: string, code?: number, context?: Record<string, unknown>);
}
/** TCP connection failure */
export declare class ConnectionError extends EIPError {
    constructor(message: string, context?: Record<string, unknown>);
}
/** Session registration failure */
export declare class SessionError extends EIPError {
    constructor(message: string, code?: number, context?: Record<string, unknown>);
}
/** Forward Open rejected */
export declare class ForwardOpenError extends EIPError {
    readonly rejectionReason: number;
    constructor(message: string, rejectionReason?: number, context?: Record<string, unknown>);
}
/** Request/response timeout */
export declare class TimeoutError extends EIPError {
    readonly duration: number;
    constructor(message: string, duration: number, context?: Record<string, unknown>);
}
/** CIP general status error */
export declare class CIPError extends EIPError {
    readonly generalStatusCode: number;
    readonly extendedStatus: number[];
    readonly statusMessage: string;
    constructor(generalStatusCode: number, extendedStatus?: number[], context?: Record<string, unknown>);
}
/** Tag path could not be resolved (CIP status 0x05) */
export declare class TagNotFoundError extends CIPError {
    constructor(tagName: string, extendedStatus?: number[]);
}
/** Write value doesn't match tag type */
export declare class TypeMismatchError extends EIPError {
    constructor(tagName: string, expectedType: string, actualType: string);
}
/** Fragmented transfer failure */
export declare class FragmentationError extends EIPError {
    constructor(message: string, context?: Record<string, unknown>);
}
//# sourceMappingURL=errors.d.ts.map