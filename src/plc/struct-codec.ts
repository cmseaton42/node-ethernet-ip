/**
 * Struct Codec — decode/encode struct buffers using Template definitions.
 *
 * Handles:
 *   - Atomic members at their byte offsets
 *   - Arrays (info field = element count)
 *   - BOOLs mapped to hidden SINT hosts (ZZZZZZZZZZ prefix)
 *   - Nested structs (recursive decode via templateLookup)
 *   - Padding bytes between members (implicit from offsets)
 */

import { Template, TemplateMember } from '@/registry/tag-registry';
import { getCodec, isValidType, CIPDataType, STRING_STRUCT_HANDLE } from '@/cip/data-types';
import { isBoolHost } from '@/cip/template';
import { TagValue, TagRecord } from './types';

/** Rockwell built-in STRING struct handle */


type TemplateLookup = (typeCode: number) => Template | undefined;

/**
 * Decode a struct buffer into a JS object using its template.
 *
 * @param template       - The struct's template definition
 * @param data           - Raw struct bytes (structureSize bytes)
 * @param templateLookup - Resolver for nested struct templates
 */
export function decodeStruct(
  template: Template,
  data: Buffer,
  templateLookup: TemplateLookup,
): TagRecord {
  const result: TagRecord = {};

  for (const member of template.members) {
    // Skip hidden BOOL host members — BOOLs are decoded from their host
    if (isBoolHost(member)) continue;

    const { name, type, offset, info } = member;

    if (type.code === CIPDataType.BOOL) {
      // BOOL: read the host SINT at this offset, extract bit from info
      result[name] = (data.readUInt8(offset) & (1 << info)) !== 0;
    } else if (type.isStruct) {
      result[name] = decodeStructMember(member, data, templateLookup);
    } else if (info > 0) {
      // Array: info = element count
      result[name] = decodeArray(type.code, data, offset, info);
    } else if (isValidType(type.code)) {
      const codec = getCodec(type.code as CIPDataType);
      result[name] = codec.decode(data, offset) as TagValue;
    }
  }

  return result;
}

/**
 * Encode a JS object into a struct buffer using its template.
 *
 * @param template       - The struct's template definition
 * @param values         - JS object with member values
 * @param templateLookup - Resolver for nested struct templates
 */
export function encodeStruct(
  template: Template,
  values: TagRecord,
  templateLookup: TemplateLookup,
): Buffer {
  const buf = Buffer.alloc(template.attributes.structureSize);

  for (const member of template.members) {
    if (isBoolHost(member)) continue;

    const { name, type, offset, info } = member;
    const val = values[name];
    if (val === undefined) continue;

    if (type.code === CIPDataType.BOOL) {
      // Set/clear bit in the host SINT
      const current = buf.readUInt8(offset);
      buf.writeUInt8(val ? current | (1 << info) : current & ~(1 << info), offset);
    } else if (type.isStruct) {
      encodeStructMember(member, val, buf, templateLookup);
    } else if (info > 0) {
      encodeArray(type.code, val as TagValue[], buf, offset);
    } else if (isValidType(type.code)) {
      const codec = getCodec(type.code as CIPDataType);
      codec.encode(val).copy(buf, offset);
    }
  }

  return buf;
}

function decodeStructMember(
  member: TemplateMember,
  data: Buffer,
  templateLookup: TemplateLookup,
): TagValue {
  // STRING special case
  if (member.type.code === STRING_STRUCT_HANDLE) {
    const codec = getCodec(CIPDataType.STRING);
    return codec.decode(data, member.offset) as string;
  }

  const nested = templateLookup(member.type.code);
  if (!nested) return Buffer.from(data.subarray(member.offset));

  if (member.info > 0) {
    // Array of structs
    const arr: TagValue[] = [];
    const elemSize = nested.attributes.structureSize;
    for (let i = 0; i < member.info; i++) {
      arr.push(decodeStruct(nested, data.subarray(member.offset + i * elemSize), templateLookup));
    }
    return arr;
  }

  return decodeStruct(nested, data.subarray(member.offset), templateLookup);
}

function encodeStructMember(
  member: TemplateMember,
  val: TagValue,
  buf: Buffer,
  templateLookup: TemplateLookup,
): void {
  if (member.type.code === STRING_STRUCT_HANDLE) {
    const codec = getCodec(CIPDataType.STRING);
    codec.encode(val).copy(buf, member.offset);
    return;
  }

  const nested = templateLookup(member.type.code);
  if (!nested) return;

  if (member.info > 0 && Array.isArray(val)) {
    const elemSize = nested.attributes.structureSize;
    for (let i = 0; i < val.length; i++) {
      encodeStruct(nested, val[i] as TagRecord, templateLookup).copy(
        buf,
        member.offset + i * elemSize,
      );
    }
    return;
  }

  encodeStruct(nested, val as TagRecord, templateLookup).copy(buf, member.offset);
}

function decodeArray(typeCode: number, data: Buffer, offset: number, count: number): TagValue[] {
  if (!isValidType(typeCode)) return [];
  const codec = getCodec(typeCode as CIPDataType);
  const result: TagValue[] = [];
  for (let i = 0; i < count; i++) {
    result.push(codec.decode(data, offset + i * codec.size) as TagValue);
  }
  return result;
}

function encodeArray(typeCode: number, values: TagValue[], buf: Buffer, offset: number): void {
  if (!isValidType(typeCode)) return;
  const codec = getCodec(typeCode as CIPDataType);
  for (let i = 0; i < values.length; i++) {
    codec.encode(values[i]).copy(buf, offset + i * codec.size);
  }
}
