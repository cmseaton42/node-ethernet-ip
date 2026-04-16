/**
 * Template Fetcher — fetch and cache UDT templates from the PLC.
 *
 * Flow:
 *   1. Get_Attribute_List → objectDefinitionSize, structureSize, memberCount, handle
 *   2. Read Template → member definitions + names
 *   3. Cache in TagRegistry
 *   4. Recursively fetch nested struct templates
 */
import { Template, TagRegistry } from '../registry/tag-registry';
/**
 * Fetch a template by instance ID, caching it in the registry.
 * Recursively fetches nested struct templates.
 *
 * @param sendCIP  - Function to send a CIP request and get the MR response data
 * @param registry - TagRegistry to cache templates in
 * @param instanceId - Template instance ID (symbolType & 0x0FFF)
 */
export declare function fetchTemplate(sendCIP: (request: Buffer) => Promise<Buffer>, registry: TagRegistry, instanceId: number): Promise<Template>;
//# sourceMappingURL=template-fetcher.d.ts.map