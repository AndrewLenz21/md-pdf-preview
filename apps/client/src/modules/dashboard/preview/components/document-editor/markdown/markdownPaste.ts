import type { JSONContent } from "@tiptap/core";

import { markdownToTiptapDocument } from "./documentToTiptap";

const MARKDOWN_BLOCK_PATTERN = /(?:^|\n)\s*(?:#{1,6}\s+\S|[-*+]\s+(?:\[[ xX]\]\s*)?\S|\d+[.)]\s+\S|>\s+\S|```|~~~|<aside\b|<\/aside>|---\s*$|\|[^|\n]+\|)/m;
const MARKDOWN_INLINE_PATTERN = /(?:\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\[[^\]]+\]\([^)]+\)|\*[^*\n]+\*|_[^_\n]+_)/;

export function isMarkdownPaste(text: string) {
  const value = text.trim();

  return (
    value.length > 0 &&
    (MARKDOWN_BLOCK_PATTERN.test(value) || MARKDOWN_INLINE_PATTERN.test(value))
  );
}

export function markdownPasteContent(text: string): JSONContent[] | null {
  if (!isMarkdownPaste(text)) {
    return null;
  }

  return markdownToTiptapDocument(text).content ?? null;
}
