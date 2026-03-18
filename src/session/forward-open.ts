/**
 * Forward Open / Forward Close.
 * Per CIP Vol 1, Section 3-5
 *
 * Forward Open tries Large (4002 bytes) first, falls back to Small (504).
 */

import { RequestPipeline } from '@/pipeline/request-pipeline';
import { parseHeader } from '@/encapsulation/header';
import { sendRRData } from '@/encapsulation/encapsulation';
import * as ConnectionManager from '@/cip/connection-manager';
import * as MessageRouter from '@/cip/message-router';
import { CIPService } from '@/cip/services';
import { EPathBuilder, LogicalType } from '@/cip/epath';
import { buildPortSegment } from '@/cip/epath/segments/port';
import { ForwardOpenError } from '@/errors';

/** Small Forward Open max connection size */
export const SMALL_CONNECTION_SIZE = 504;

/** Large Forward Open max connection size */
export const LARGE_CONNECTION_SIZE = 4002;

/** Backplane port number */
const BACKPLANE_PORT = 1;

export interface ForwardOpenResult {
  connectionId: number;
  connectionSize: number;
  connectionSerial: number;
}

/**
 * Attempt Forward Open — Large first, fallback to Small.
 * Returns the negotiated connection size and serial.
 */
export async function doForwardOpen(
  pipeline: RequestPipeline,
  sessionId: number,
  slot: number,
  timeoutMs: number,
): Promise<ForwardOpenResult> {
  const routePath = buildPortSegment(BACKPLANE_PORT, slot);

  // Try Large Forward Open first
  try {
    return await sendForwardOpen(
      pipeline,
      sessionId,
      routePath,
      timeoutMs,
      CIPService.LARGE_FORWARD_OPEN,
      LARGE_CONNECTION_SIZE,
    );
  } catch {
    // Fallback to Small Forward Open
    return await sendForwardOpen(
      pipeline,
      sessionId,
      routePath,
      timeoutMs,
      CIPService.FORWARD_OPEN,
      SMALL_CONNECTION_SIZE,
    );
  }
}

/**
 * Send a single Forward Open request.
 */
async function sendForwardOpen(
  pipeline: RequestPipeline,
  sessionId: number,
  routePath: Buffer,
  timeoutMs: number,
  service: number,
  size: number,
): Promise<ForwardOpenResult> {
  const connectionSerial = Math.floor(Math.random() * 0x7fff);

  const connParams = ConnectionManager.encodeConnectionParams(
    ConnectionManager.Owner.Exclusive,
    ConnectionManager.ConnectionType.PointToPoint,
    ConnectionManager.Priority.Low,
    ConnectionManager.FixedVar.Variable,
    size,
  );

  // Build Forward Open data (small or large format)
  const isLarge = service === CIPService.LARGE_FORWARD_OPEN;
  const fwdOpenData = isLarge
    ? ConnectionManager.buildLargeForwardOpenData({ connectionParams: size, connectionSerial })
    : ConnectionManager.buildForwardOpenData({ connectionParams: connParams, connectionSerial });

  // Connection Manager path: Class 0x06, Instance 0x01
  const cmPath = new EPathBuilder()
    .logical(LogicalType.ClassID, 0x06)
    .logical(LogicalType.InstanceID, 0x01)
    .build();

  // Message Router request header
  const mrHeader = MessageRouter.build(service, cmPath, Buffer.alloc(0));

  // Connection path: route to CPU + Message Router object
  const mrPath = new EPathBuilder()
    .logical(LogicalType.ClassID, 0x02)
    .logical(LogicalType.InstanceID, 0x01)
    .build();
  const fullPath = Buffer.concat([routePath, mrPath]);

  // Path size in words + path
  const pathSizeBuf = Buffer.alloc(1);
  pathSizeBuf.writeUInt8(Math.ceil(fullPath.length / 2), 0);

  // Assemble and wrap in SendRRData
  const cipPacket = Buffer.concat([mrHeader, fwdOpenData, pathSizeBuf, fullPath]);
  const eipPacket = sendRRData(sessionId, cipPacket);

  // Send and parse response
  const response = await pipeline.send(eipPacket, timeoutMs);
  const eipParsed = parseHeader(response);

  // Extract CIP data from CPF:
  // Interface Handle(4) + Timeout(2) + ItemCount(2) + NullItem(4) + UCMMHeader(4) = offset 16
  const CIP_DATA_OFFSET = 16;
  const cipData = eipParsed.data.subarray(CIP_DATA_OFFSET);
  const mrResponse = MessageRouter.parse(cipData);

  if (mrResponse.generalStatusCode !== 0) {
    throw new ForwardOpenError(
      `Forward Open rejected (status 0x${mrResponse.generalStatusCode.toString(16)})`,
      mrResponse.generalStatusCode,
    );
  }

  // Forward Open response: O→T Connection ID at offset 0 (UINT32LE)
  const connectionId = mrResponse.data.readUInt32LE(0);

  return { connectionId, connectionSize: size, connectionSerial };
}

/**
 * Send Forward Close (best-effort, won't throw on failure).
 */
export async function doForwardClose(
  pipeline: RequestPipeline,
  sessionId: number,
  connectionSerial: number,
  timeoutMs: number,
): Promise<void> {
  const closeData = ConnectionManager.buildForwardCloseData({ connectionSerial });

  const cmPath = new EPathBuilder()
    .logical(LogicalType.ClassID, 0x06)
    .logical(LogicalType.InstanceID, 0x01)
    .build();

  const mrRequest = MessageRouter.build(CIPService.FORWARD_CLOSE, cmPath, closeData);
  const eipPacket = sendRRData(sessionId, mrRequest);

  // Best-effort — don't throw if PLC doesn't respond
  await pipeline.send(eipPacket, timeoutMs).catch(() => {});
}
