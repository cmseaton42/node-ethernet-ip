/**
 * Template Object (Class 0x6C) — build/parse for Get Template Attributes
 * and Read Template requests.
 *
 * Per Rockwell "Logix5000 Data Access" manual, Steps 3-4.
 *
 * Get_Attribute_List (0x03) retrieves:
 *   Attr 4: objectDefinitionSize (UDINT, 32-bit words)
 *   Attr 5: structureSize (UDINT, bytes on wire)
 *   Attr 2: memberCount (UINT)
 *   Attr 1: structureHandle (UINT, CRC)
 *
 * Read Template (0x4C) retrieves per member:
 *   info(2) + type(2) + offset(4) = 8 bytes each
 *   Followed by null-terminated strings: template name, then member names.
 */

import * as MessageRouter from './message-router';
import { CIPService } from './services';
import { LogicalType, buildLogicalSegment } from './epath/segments/logical';
import { TemplateAttribute, TemplateMember } from '@/registry/tag-registry';

/** Template class ID */
const TEMPLATE_CLASS = 0x6c;

/** Bytes subtracted from (objectDefinitionSize * 4) to get read byte count */
const DEFINITION_OVERHEAD = 23;

/** Each member definition: info(2) + type(2) + offset(4) */
const MEMBER_DEF_SIZE = 8;

/** Build EPATH: Class 0x6C, Instance <id> */
function templatePath(instanceId: number): Buffer {
  return Buffer.concat([
    buildLogicalSegment(LogicalType.ClassID, TEMPLATE_CLASS),
    buildLogicalSegment(LogicalType.InstanceID, instanceId),
  ]);
}

/**
 * Build a Get_Attribute_List request for a Template instance.
 * Requests attributes 4, 5, 2, 1 (per Rockwell example).
 */
export function buildGetAttributesRequest(instanceId: number): Buffer {
  const data = Buffer.alloc(10); // count(2) + 4 × attrId(2)
  data.writeUInt16LE(4, 0);
  data.writeUInt16LE(4, 2); // objectDefinitionSize
  data.writeUInt16LE(5, 4); // structureSize
  data.writeUInt16LE(2, 6); // memberCount
  data.writeUInt16LE(1, 8); // structureHandle
  return MessageRouter.build(CIPService.GET_ATTRIBUTES, templatePath(instanceId), data);
}

/**
 * Parse a Get_Attribute_List response.
 *
 * Response layout (after MR header):
 *   count(2), then per attribute: attrId(2) + status(2) + value(N)
 */
export function parseGetAttributesResponse(data: Buffer): TemplateAttribute {
  let pos = 2; // skip count

  // Attr 4: objectDefinitionSize (UDINT)
  pos += 4; // attrId + status
  const objectDefinitionSize = data.readUInt32LE(pos);
  pos += 4;

  // Attr 5: structureSize (UDINT)
  pos += 4;
  const structureSize = data.readUInt32LE(pos);
  pos += 4;

  // Attr 2: memberCount (UINT)
  pos += 4;
  const memberCount = data.readUInt16LE(pos);
  pos += 2;

  // Attr 1: structureHandle (UINT)
  pos += 4;
  const structureHandle = data.readUInt16LE(pos);

  return { id: 0, objectDefinitionSize, structureSize, memberCount, structureHandle };
}

/** Calculate byte count for Read Template request. */
export function calcReadByteCount(objectDefinitionSize: number): number {
  return objectDefinitionSize * 4 - DEFINITION_OVERHEAD;
}

/**
 * Build a Read Template request (service 0x4C to class 0x6C).
 */
export function buildReadTemplateRequest(
  instanceId: number,
  offset: number,
  byteCount: number,
): Buffer {
  const data = Buffer.alloc(6);
  data.writeUInt32LE(offset, 0);
  data.writeUInt16LE(byteCount, 4);
  return MessageRouter.build(CIPService.READ_TAG, templatePath(instanceId), data);
}

/**
 * Parse a Read Template response into member definitions and names.
 *
 * Layout:
 *   [member0(8), member1(8), ..., templateName\0, member0Name\0, ...]
 *
 * Template name may have ";n..." suffix — stripped.
 */
export function parseReadTemplateResponse(
  data: Buffer,
  memberCount: number,
): { members: TemplateMember[]; name: string } {
  const members: TemplateMember[] = [];

  for (let i = 0; i < memberCount; i++) {
    const base = i * MEMBER_DEF_SIZE;
    const info = data.readUInt16LE(base);
    const rawType = data.readUInt16LE(base + 2);
    const offset = data.readUInt32LE(base + 4);

    members.push({
      name: '',
      info,
      type: {
        code: rawType & 0x0fff,
        isStruct: (rawType & 0x8000) !== 0,
        isReserved: false,
        arrayDims: (rawType >> 13) & 0x03,
      },
      offset,
    });
  }

  // Null-terminated strings after member defs
  const strStart = memberCount * MEMBER_DEF_SIZE;
  const strings = parseNullStrings(data.subarray(strStart), memberCount + 1);

  // Template name: strip ";..." suffix
  const raw = strings[0] ?? '';
  const name = raw.includes(';') ? raw.substring(0, raw.indexOf(';')) : raw;

  for (let i = 0; i < memberCount; i++) {
    members[i].name = strings[i + 1] ?? '';
  }

  return { members, name };
}

/** Extract up to `count` null-terminated strings from a buffer. */
function parseNullStrings(buf: Buffer, count: number): string[] {
  const result: string[] = [];
  let pos = 0;
  for (let i = 0; i < count && pos < buf.length; i++) {
    const end = buf.indexOf(0x00, pos);
    if (end === -1) {
      result.push(buf.toString('ascii', pos));
      break;
    }
    result.push(buf.toString('ascii', pos, end));
    pos = end + 1;
  }
  return result;
}

/** Check if a member is a hidden BOOL host (ZZZZZZZZZZ or __ prefix). */
export function isBoolHost(member: TemplateMember): boolean {
  return member.name.startsWith('ZZZZZZZZZZ') || member.name.startsWith('__');
}
