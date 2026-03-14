/**
 * Port Segment — for routing through backplane/ethernet.
 * Per CIP Vol 1, Appendix C — Port Segment Encoding
 *
 * Port identifier byte:
 *   bits 3-0: port number (0x0F = extended, actual port follows as UINT16LE)
 *   bit 4:    extended link flag (set when link address > 1 byte)
 *
 * Result is always padded to even length.
 */

/** Extended link flag — bit 4 of port identifier byte */
const EXTENDED_LINK_FLAG = 0x10;

/** Extended port marker — low nibble 0x0F means port follows as UINT16LE */
const EXTENDED_PORT_MARKER = 0x0f;

/** Max port number that fits in the low nibble (4 bits) */
const MAX_SHORT_PORT = 14;

export function buildPortSegment(port: number, link: number | string): Buffer {
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Port must be a positive integer, got ${port}`);
  }

  const linkBuf = typeof link === 'string' ? Buffer.from(link) : Buffer.from([link]);
  const extendedLink = linkBuf.length > 1;

  let portIdByte = 0x00;
  let headerBuf: Buffer;

  if (port <= MAX_SHORT_PORT) {
    // Port fits in low nibble
    portIdByte |= port;

    if (extendedLink) {
      // [portId | extFlag, linkLength(UINT8)]
      portIdByte |= EXTENDED_LINK_FLAG;
      headerBuf = Buffer.alloc(2);
      headerBuf.writeUInt8(linkBuf.length, 1);
    } else {
      // [portId]
      headerBuf = Buffer.alloc(1);
    }
  } else {
    // Extended port: low nibble = 0x0F, port follows as UINT16LE
    portIdByte |= EXTENDED_PORT_MARKER;

    if (extendedLink) {
      // [portId | extFlag, linkLength(UINT8), port(UINT16LE)]
      portIdByte |= EXTENDED_LINK_FLAG;
      headerBuf = Buffer.alloc(4);
      headerBuf.writeUInt8(linkBuf.length, 1);
      headerBuf.writeUInt16LE(port, 2);
    } else {
      // [portId, port(UINT16LE)]
      headerBuf = Buffer.alloc(3);
      headerBuf.writeUInt16LE(port, 1);
    }
  }

  headerBuf.writeUInt8(portIdByte, 0);

  // Concatenate header + link, pad to even length
  let result = Buffer.concat([headerBuf, linkBuf]);
  if (result.length % 2 !== 0) {
    result = Buffer.concat([result, Buffer.alloc(1)]);
  }

  return result;
}
