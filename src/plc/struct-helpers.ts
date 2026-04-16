/**
 * Struct helpers — extracted from PLC class for readability.
 */

import { TagRegistry, Template } from '@/registry/tag-registry';
import { CIPDataType, getTypeName, STRING_STRUCT_HANDLE } from '@/cip/data-types';
import { isBoolHost } from '@/cip/template';
import { decodeStruct, encodeStruct } from './struct-codec';
import { TagValue, TagRecord } from './types';

export interface MemberShape {
  type: string;
  array?: number;
  members?: Record<string, MemberShape>;
}

export interface StructShape {
  name: string;
  members: Record<string, MemberShape>;
}

/** Create a template lookup function from a registry. */
export function templateLookup(registry: TagRegistry): (code: number) => Template | undefined {
  return (code) => registry.lookupTemplateByHandle(code) ?? registry.lookupTemplate(code);
}

/** Build a recursive shape description for a struct template. */
export function buildShape(tmpl: Template, registry: TagRegistry): StructShape {
  const lookup = templateLookup(registry);
  const members: Record<string, MemberShape> = {};
  for (const m of tmpl.members) {
    if (isBoolHost(m)) continue;
    const shape: MemberShape = {
      type: m.type.isStruct
        ? m.type.code === STRING_STRUCT_HANDLE
          ? 'STRING'
          : (lookup(m.type.code)?.name ?? `0x${m.type.code.toString(16)}`)
        : getTypeName(m.type.code as CIPDataType),
    };
    if (m.info > 0 && m.type.code !== CIPDataType.BOOL) shape.array = m.info;
    if (m.type.isStruct && m.type.code !== STRING_STRUCT_HANDLE) {
      const nested = lookup(m.type.code);
      if (nested) shape.members = buildShape(nested, registry).members;
    }
    members[m.name] = shape;
  }
  return { name: tmpl.name, members };
}

/** Encode a struct value to Buffer if template is available, otherwise return as-is. */
export function encodeIfStruct(
  value: TagValue,
  entry: { type: number; isStruct: boolean },
  registry: TagRegistry,
): TagValue {
  if (
    entry.isStruct &&
    typeof value === 'object' &&
    !Buffer.isBuffer(value) &&
    !Array.isArray(value)
  ) {
    const lookup = templateLookup(registry);
    const tmpl = lookup(entry.type);
    if (tmpl) return encodeStruct(tmpl, value as TagRecord, lookup);
  }
  return value;
}

/** Decode a struct Buffer to a JS object if template is available, otherwise return as-is. */
export function decodeIfStruct(
  value: TagValue,
  template: Template | undefined,
  registry: TagRegistry,
): TagValue {
  if (template && Buffer.isBuffer(value)) {
    return decodeStruct(template, value, templateLookup(registry));
  }
  return value;
}
