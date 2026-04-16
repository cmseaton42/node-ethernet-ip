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

import { LogicalType, buildLogicalSegment } from './epath/segments/logical';
import * as MessageRouter from './message-router';
import { CIPService } from './services';

/** Connection Manager object: Class 0x06, Instance 0x01 */
const CONNECTION_MANAGER_PATH = Buffer.concat([
  buildLogicalSegment(LogicalType.ClassID, 0x06),
  buildLogicalSegment(LogicalType.InstanceID, 0x01),
]);

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
export function encodeTimeout(timeoutMs: number): EncodedTimeout {
  if (timeoutMs <= 0 || !Number.isInteger(timeoutMs)) {
    throw new Error(`Timeout must be a positive integer, got ${timeoutMs}`);
  }

  let bestDiff = Infinity;
  let timeTick = 0;
  let ticks = 0;

  for (let tick = 0; tick < 16; tick++) {
    for (let count = 1; count < 256; count++) {
      const diff = Math.abs(timeoutMs - Math.pow(2, tick) * count);
      if (diff < bestDiff) {
        bestDiff = diff;
        timeTick = tick;
        ticks = count;
      }
    }
  }

  return { timeTick, ticks };
}

/**
 * Build an Unconnected Send packet.
 *
 * @param messageRequest - The CIP message to wrap
 * @param routePath      - EPATH to the target (e.g. backplane port + slot)
 * @param timeoutMs      - Timeout in milliseconds (default 2000)
 */
export function build(messageRequest: Buffer, routePath: Buffer, timeoutMs = 2000): Buffer {
  const timeout = encodeTimeout(Math.max(timeoutMs, 100));

  // Timeout header: [timeTick(1), ticks(1)]
  const timeoutBuf = Buffer.alloc(2);
  timeoutBuf.writeUInt8(timeout.timeTick, 0);
  timeoutBuf.writeUInt8(timeout.ticks, 1);

  // Message length (UINT16LE)
  const msgLenBuf = Buffer.alloc(2);
  msgLenBuf.writeUInt16LE(messageRequest.length, 0);

  // Route path: size in words (USINT) + reserved byte (0x00) + path
  const routePathWords = Math.ceil(routePath.length / 2);
  const routePathHeader = Buffer.alloc(2);
  routePathHeader.writeUInt8(routePathWords, 0); // Path size (words)
  // reserved byte at offset 1 already 0x00

  // Pad byte if message request is odd length
  const needsPad = messageRequest.length % 2 === 1;
  const padBuf = needsPad ? Buffer.alloc(1) : Buffer.alloc(0);

  // Assemble: timeout + msgLen + message + [pad] + routePathHeader + routePath
  const data = Buffer.concat([
    timeoutBuf,
    msgLenBuf,
    messageRequest,
    padBuf,
    routePathHeader,
    routePath,
  ]);

  // Wrap in Message Router targeting Connection Manager
  return MessageRouter.build(CIPService.UNCONNECTED_SEND, CONNECTION_MANAGER_PATH, data);
}
