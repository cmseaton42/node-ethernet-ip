/**
 * Tag path utilities — convert tag name strings to CIP EPATH buffers.
 */

import { EPathBuilder } from '@/cip/epath';

/**
 * Build an EPATH buffer from a tag name string.
 * Handles: "Tag", "Tag[3]", "Tag.Member", "Tag[1,2]", "Program:Main.Tag"
 */
export function buildTagPath(tagName: string): Buffer {
  const builder = new EPathBuilder();

  const parts = tagName.split('.');
  for (const part of parts) {
    // Skip bit index (e.g. the "5" in "MyDINT.5")
    if (/^\d{1,2}$/.test(part)) continue;

    const bracketIdx = part.indexOf('[');
    if (bracketIdx !== -1) {
      // "TagName[3]" or "TagName[1,2,3]"
      const name = part.substring(0, bracketIdx);
      const indices = part.substring(bracketIdx + 1, part.length - 1);
      builder.symbolic(name);
      for (const idx of indices.split(',')) {
        builder.element(parseInt(idx, 10));
      }
    } else {
      builder.symbolic(part);
    }
  }

  return builder.build();
}

/**
 * Detect bit-of-word reference (e.g. "MyDINT.5").
 * Returns the bit index (0-31) or null.
 */
export function extractBitIndex(tagName: string): number | null {
  const parts = tagName.split('.');
  const last = parts[parts.length - 1];
  if (/^\d{1,2}$/.test(last)) {
    const bit = parseInt(last, 10);
    if (bit >= 0 && bit <= 31) return bit;
  }
  return null;
}
