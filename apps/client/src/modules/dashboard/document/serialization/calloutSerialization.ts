import type { DocumentBlock } from "../model/document-block.types";

export function serializeCalloutBlock(
  block: DocumentBlock,
  innerMarkdown: string,
) {
  if (!block.callout) {
    return innerMarkdown;
  }

  const content = [block.callout.icon, innerMarkdown.trim()]
    .filter((part) => part && part.length > 0)
    .join("\n\n");

  return content.length > 0
    ? `${block.callout.openingTag}\n${content}\n</aside>`
    : `${block.callout.openingTag}\n</aside>`;
}
