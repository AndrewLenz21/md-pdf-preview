import type { DocumentBlock } from "@/modules/dashboard/document/model/document-block.types";

import type { DocumentPagePlan } from "./pagination/paginateDocument";

export type PaperPageSourceRange = {
  from: number;
  to: number;
  markdown: string;
};

function getFragmentSourceRange(
  fragment: DocumentPagePlan["fragments"][number],
  parentBlock: DocumentBlock,
) {
  if (fragment.kind === "blankSpace") {
    return fragment.blankSpace?.sourceRange ?? fragment.sourceRange;
  }

  return {
    from: parentBlock.range.start + fragment.sourceRange.from,
    to: parentBlock.range.start + fragment.sourceRange.to,
  };
}

export function getPaperPageSourceRange(
  pagePlan: DocumentPagePlan,
  blocks: DocumentBlock[],
  markdown: string,
): PaperPageSourceRange | null {
  const blockMap = new Map(blocks.map((block) => [block.id, block]));
  const ranges = pagePlan.fragments.flatMap((fragment) => {
    const parentBlock = blockMap.get(fragment.parentBlockId);

    return parentBlock ? [getFragmentSourceRange(fragment, parentBlock)] : [];
  });

  if (ranges.length === 0) {
    return null;
  }

  const from = Math.min(...ranges.map((range) => range.from));
  const to = Math.max(...ranges.map((range) => range.to));

  return {
    from,
    to,
    markdown: markdown.slice(from, to),
  };
}

export function replacePaperPageSource(
  markdown: string,
  range: PaperPageSourceRange,
  pageMarkdown: string,
) {
  return markdown.slice(0, range.from) + pageMarkdown + markdown.slice(range.to);
}
