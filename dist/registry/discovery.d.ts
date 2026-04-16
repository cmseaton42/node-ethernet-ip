/**
 * Tag list discovery — Get Instance Attribute List (class 0x6B).
 * Per CIP Vol 1, Chapter 7 — Symbol Object
 *
 * Paginates with status 0x06 (partial transfer).
 */
import { RequestPipeline } from '../pipeline/request-pipeline';
import { Template } from './tag-registry';
export interface DiscoveredTag {
    id: number;
    name: string;
    type: {
        code: number;
        isStruct: boolean;
        isReserved: boolean;
        arrayDims: number;
        /** Size of each dimension (e.g. [10, 5] for a 10×5 2D array). Empty if not an array. */
        dimSizes: number[];
    };
    program: string | null;
    template?: Template;
}
/**
 * Parse the tag type bit field.
 * Bit 15 = struct, bits 14-13 = array dims, bit 12 = reserved, bits 11-0 = type code
 */
export declare function parseTagType(raw: number): DiscoveredTag['type'];
/**
 * Filter rules per Rockwell Data Access manual (1756-PM020D, Step 2):
 *
 * 1. Discard tags with bit 12 set (isReserved — system tags)
 * 2. Discard names starting with "__" (system tags)
 * 3. Discard names containing ":" UNLESS the prefix is "Program"
 *    - "Program:X" entries are program scope markers, not readable tags
 *    - "Map:", "Task:", "Cxn:", module I/O like "Codesys:I" are discarded
 *
 * Returns true if the tag should be kept.
 */
export declare function isUserTag(tag: DiscoveredTag): boolean;
/**
 * Extract program names from discovered tags.
 * "Program:MainProgram" → "MainProgram"
 * Note: Program entries typically have bit 12 (reserved) set.
 */
export declare function extractProgramNames(tags: DiscoveredTag[]): string[];
/**
 * Discover all tags from the PLC.
 * Paginates automatically when status 0x06 is returned.
 */
export declare function discoverAll(pipeline: RequestPipeline, sessionId: number, timeoutMs: number, program?: string): Promise<DiscoveredTag[]>;
/**
 * Discover all user tags, including program-scoped tags.
 * 1. Discover controller-scope tags
 * 2. Extract program names from "Program:X" entries
 * 3. Discover tags within each program
 * 4. Filter to user-created tags only
 */
export declare function discoverUserTags(pipeline: RequestPipeline, sessionId: number, timeoutMs: number): Promise<DiscoveredTag[]>;
//# sourceMappingURL=discovery.d.ts.map