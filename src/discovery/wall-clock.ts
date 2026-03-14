/**
 * Wall Clock — Get/Set Attribute Single on WallClock Object.
 * Per CIP Vol 1 — WallClock Object (Class 0x8B, Instance 0x01, Attribute 0x05)
 */

import * as MessageRouter from '@/cip/message-router';
import { CIPService } from '@/cip/services';
import { EPathBuilder, LogicalType } from '@/cip/epath';

/** WallClock Object: Class 0x8B, Instance 0x01, Attribute 0x05 (Local Time) */
const WALL_CLOCK_PATH = new EPathBuilder()
  .logical(LogicalType.ClassID, 0x8b)
  .logical(LogicalType.InstanceID, 0x01)
  .logical(LogicalType.AttributeID, 0x05)
  .build();

/** Number of UINT32LE fields in the wall clock response */
const CLOCK_FIELDS = 7;

export function buildReadWallClockRequest(): Buffer {
  return MessageRouter.build(CIPService.GET_ATTRIBUTE_SINGLE, WALL_CLOCK_PATH, Buffer.alloc(0));
}

/** Parse wall clock response into a Date. Fields: year, month, day, hour, min, sec, microsec */
export function parseWallClockResponse(data: Buffer): Date {
  const fields: number[] = [];
  for (let i = 0; i < CLOCK_FIELDS; i++) {
    fields.push(data.readUInt32LE(i * 4));
  }
  // month is 1-based from PLC, Date constructor expects 0-based
  return new Date(
    fields[0],
    fields[1] - 1,
    fields[2],
    fields[3],
    fields[4],
    fields[5],
    Math.trunc(fields[6] / 1000),
  );
}

export function buildWriteWallClockRequest(date: Date): Buffer {
  const data = Buffer.alloc(CLOCK_FIELDS * 4);
  data.writeUInt32LE(date.getFullYear(), 0);
  data.writeUInt32LE(date.getMonth() + 1, 4);
  data.writeUInt32LE(date.getDate(), 8);
  data.writeUInt32LE(date.getHours(), 12);
  data.writeUInt32LE(date.getMinutes(), 16);
  data.writeUInt32LE(date.getSeconds(), 20);
  data.writeUInt32LE(date.getMilliseconds() * 1000, 24);
  return MessageRouter.build(CIPService.SET_ATTRIBUTE_SINGLE, WALL_CLOCK_PATH, data);
}
