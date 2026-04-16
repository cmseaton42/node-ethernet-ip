/**
 * Tag path utilities — convert tag name strings to CIP EPATH buffers.
 */
/**
 * Build an EPATH buffer from a tag name string.
 * Handles: "Tag", "Tag[3]", "Tag.Member", "Tag[1,2]", "Program:Main.Tag"
 */
export declare function buildTagPath(tagName: string): Buffer;
/**
 * Detect bit-of-word reference (e.g. "MyDINT.5").
 * Returns the bit index (0-31) or null.
 */
export declare function extractBitIndex(tagName: string): number | null;
//# sourceMappingURL=tag-path.d.ts.map