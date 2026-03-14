import { getStatusMessage } from './cip-status-codes';

/** Base error for all EtherNet/IP errors */
export class EIPError extends Error {
  constructor(
    message: string,
    public readonly code: number = 0,
    public readonly context: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'EIPError';
  }
}

/** TCP connection failure */
export class ConnectionError extends EIPError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message, 0, context);
    this.name = 'ConnectionError';
  }
}

/** Session registration failure */
export class SessionError extends EIPError {
  constructor(message: string, code: number = 0, context: Record<string, unknown> = {}) {
    super(message, code, context);
    this.name = 'SessionError';
  }
}

/** Forward Open rejected */
export class ForwardOpenError extends EIPError {
  constructor(
    message: string,
    public readonly rejectionReason: number = 0,
    context: Record<string, unknown> = {},
  ) {
    super(message, rejectionReason, context);
    this.name = 'ForwardOpenError';
  }
}

/** Request/response timeout */
export class TimeoutError extends EIPError {
  constructor(
    message: string,
    public readonly duration: number,
    context: Record<string, unknown> = {},
  ) {
    super(message, 0, context);
    this.name = 'TimeoutError';
  }
}

/** CIP general status error */
export class CIPError extends EIPError {
  public readonly statusMessage: string;

  constructor(
    public readonly generalStatusCode: number,
    public readonly extendedStatus: number[] = [],
    context: Record<string, unknown> = {},
  ) {
    const statusMsg = getStatusMessage(generalStatusCode);
    super(`CIP Error: ${statusMsg}`, generalStatusCode, context);
    this.statusMessage = statusMsg;
    this.name = 'CIPError';
  }
}

/** Tag path could not be resolved (CIP status 0x05) */
export class TagNotFoundError extends CIPError {
  constructor(tagName: string, extendedStatus: number[] = []) {
    super(0x05, extendedStatus, { tagName });
    this.name = 'TagNotFoundError';
  }
}

/** Write value doesn't match tag type */
export class TypeMismatchError extends EIPError {
  constructor(tagName: string, expectedType: string, actualType: string) {
    super(`Type mismatch for "${tagName}": expected ${expectedType}, got ${actualType}`, 0, {
      tagName,
      expectedType,
      actualType,
    });
    this.name = 'TypeMismatchError';
  }
}

/** Fragmented transfer failure */
export class FragmentationError extends EIPError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message, 0, context);
    this.name = 'FragmentationError';
  }
}
