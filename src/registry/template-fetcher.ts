/**
 * Template Fetcher — fetch and cache UDT templates from the PLC.
 *
 * Flow:
 *   1. Get_Attribute_List → objectDefinitionSize, structureSize, memberCount, handle
 *   2. Read Template → member definitions + names
 *   3. Cache in TagRegistry
 *   4. Recursively fetch nested struct templates
 */

import * as MessageRouter from '@/cip/message-router';
import {
  buildGetAttributesRequest,
  parseGetAttributesResponse,
  buildReadTemplateRequest,
  parseReadTemplateResponse,
  calcReadByteCount,
} from '@/cip/template';
import { CIPError } from '@/errors';
import { Template, TagRegistry } from '@/registry/tag-registry';

/** CIP status: more data available (fragmented response) */
const STATUS_FRAGMENTED = 0x06;

/**
 * Fetch a template by instance ID, caching it in the registry.
 * Recursively fetches nested struct templates.
 *
 * @param sendCIP  - Function to send a CIP request and get the MR response data
 * @param registry - TagRegistry to cache templates in
 * @param instanceId - Template instance ID (symbolType & 0x0FFF)
 */
export async function fetchTemplate(
  sendCIP: (request: Buffer) => Promise<Buffer>,
  registry: TagRegistry,
  instanceId: number,
): Promise<Template> {
  // Check cache first
  const cached = registry.lookupTemplate(instanceId);
  if (cached) return cached;

  // Step 1: Get attributes
  const attrResp = await sendCIP(buildGetAttributesRequest(instanceId));
  const attrMR = MessageRouter.parse(attrResp);
  if (attrMR.generalStatusCode !== 0) {
    throw new CIPError(attrMR.generalStatusCode, attrMR.extendedStatus);
  }
  const attrs = parseGetAttributesResponse(attrMR.data);
  attrs.id = instanceId;

  // Step 2: Read template (handle fragmentation)
  const totalBytes = calcReadByteCount(attrs.objectDefinitionSize);
  let templateData = Buffer.alloc(0);
  let offset = 0;

  while (offset < totalBytes) {
    const remaining = totalBytes - offset;
    const req = buildReadTemplateRequest(instanceId, offset, remaining);
    const resp = await sendCIP(req);
    const mr = MessageRouter.parse(resp);

    if (mr.generalStatusCode !== 0 && mr.generalStatusCode !== STATUS_FRAGMENTED) {
      throw new CIPError(mr.generalStatusCode, mr.extendedStatus);
    }

    templateData = Buffer.concat([templateData, mr.data]);
    offset = templateData.length;

    if (mr.generalStatusCode === 0) break;
  }

  // Step 3: Parse members and names
  const { members, name } = parseReadTemplateResponse(templateData, attrs.memberCount);
  const template: Template = { name, attributes: attrs, members };

  // Cache before recursing (prevents infinite loops on circular refs)
  registry.registerTemplate(instanceId, template);

  // Step 4: Recursively fetch nested struct templates
  for (const member of members) {
    if (member.type.isStruct && !registry.lookupTemplate(member.type.code)) {
      await fetchTemplate(sendCIP, registry, member.type.code);
    }
  }

  return template;
}
