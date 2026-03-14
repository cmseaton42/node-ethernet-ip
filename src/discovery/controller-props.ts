/**
 * Controller properties — Get Attribute All on Identity Object.
 * Per CIP Vol 1, Chapter 5 — Identity Object (Class 0x01, Instance 0x01)
 */

import * as MessageRouter from '@/cip/message-router';
import { CIPService } from '@/cip/services';
import { EPathBuilder, LogicalType } from '@/cip/epath';
import { ControllerProperties } from './types';

/** Identity Object: Class 0x01, Instance 0x01 */
const IDENTITY_PATH = new EPathBuilder()
  .logical(LogicalType.ClassID, 0x01)
  .logical(LogicalType.InstanceID, 0x01)
  .build();

/** Build a Get Attribute All request for the Identity Object. */
export function buildGetControllerPropsRequest(): Buffer {
  return MessageRouter.build(CIPService.GET_ATTRIBUTE_ALL, IDENTITY_PATH, Buffer.alloc(0));
}

/**
 * Parse Identity Object response.
 * Layout: vendor(2), deviceType(2), productCode(2), major(1), minor(1),
 *         status(2), serialNumber(4), nameLength(1), name(N)
 */
export function parseControllerProps(data: Buffer): ControllerProperties {
  let ptr = 0;

  ptr += 2; // vendor ID
  ptr += 2; // device type
  ptr += 2; // product code

  const major = data.readUInt8(ptr);
  ptr += 1;
  const minor = data.readUInt8(ptr);
  ptr += 1;
  const version = `${major}.${minor}`;

  const status = data.readUInt16LE(ptr);
  ptr += 2;
  const serialNumber = data.readUInt32LE(ptr);
  ptr += 4;

  const nameLen = data.readUInt8(ptr);
  ptr += 1;
  const name = data.subarray(ptr, ptr + nameLen).toString('utf8');

  // Parse status flags
  const statusMasked = status & 0x0ff0;
  const faulted = (statusMasked & 0x0f00) !== 0;
  const run = (status & 0x00f0) === 0x0060;
  const program = (status & 0x00f0) === 0x0070;

  return { name, serialNumber, version, status, faulted, run, program };
}
