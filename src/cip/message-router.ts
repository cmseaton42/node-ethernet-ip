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
export function build(service: number, path: Buffer, data: Buffer = Buffer.alloc(0)): Buffer {
  // Path size in 16-bit words
  const pathWords = Math.ceil(path.length / 2);
  const pathBytes = pathWords * 2;

  const buf = Buffer.alloc(2 + pathBytes + data.length);

  buf.writeUInt8(service, 0); // Service code
  buf.writeUInt8(pathWords, 1); // Path size (words)
  path.copy(buf, 2); // Padded EPATH
  data.copy(buf, 2 + pathBytes); // Service data

  return buf;
}

/**
 * Parse a Message Router response.
 */
export function parse(buf: Buffer): MessageRouterResponse {
  const service = buf.readUInt8(0); // Reply service (request | 0x80)
  // byte 1 reserved
  const generalStatusCode = buf.readUInt8(2);
  const extendedStatusLength = buf.readUInt8(3); // In 16-bit words

  // Extended status: array of UINT16LE
  const extendedStatus: number[] = [];
  for (let i = 0; i < extendedStatusLength; i++) {
    extendedStatus.push(buf.readUInt16LE(4 + i * 2));
  }

  // Data follows extended status
  const dataOffset = 4 + extendedStatusLength * 2;
  const data = buf.subarray(dataOffset);

  return { service, generalStatusCode, extendedStatusLength, extendedStatus, data };
}
