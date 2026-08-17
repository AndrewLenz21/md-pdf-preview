import type { DocumentBlock } from "../model/document-block.types";

export function replaceBlockSource(
  markdown: string,
  block: DocumentBlock,
  nextSource: string,
) {
  return `${markdown.slice(0, block.range.start)}${nextSource}${markdown.slice(block.range.end)}`;
}
