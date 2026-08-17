import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";

import type { Root, RootContent } from "mdast";

import type {
  CalloutVariant,
  DocumentBlock,
  DocumentBlockKind,
  ParsedMarkdownDocument,
} from "../model/document-block.types";
import { normalizeEscapedEmphasis } from "./normalizeEscapedEmphasis";

const markdownParser = unified().use(remarkParse).use(remarkGfm);

const SUPPORTED_BLOCK_TYPES = new Set([
  "heading",
  "paragraph",
  "list",
  "table",
  "code",
  "blockquote",
  "thematicBreak",
]);

const LEADING_ICON_PATTERN = /^(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*|\p{Regional_Indicator}{2})/u;

type MarkdownTreeNode = {
  type?: string;
  value?: string;
  children?: MarkdownTreeNode[];
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

function getOffset(node: RootContent, edge: "start" | "end") {
  return node.position?.[edge].offset;
}

function getBlockKind(node: RootContent): DocumentBlockKind {
  if (node.type === "html") {
    return "unsupported";
  }

  if (node.type === "definition") {
    return "definition";
  }

  return SUPPORTED_BLOCK_TYPES.has(node.type)
    ? (node.type as DocumentBlockKind)
    : "unsupported";
}

function getCalloutVariant(attributes: string): CalloutVariant {
  const explicitVariant = attributes.match(
    /(?:data-(?:variant|callout)|class)\s*=\s*["'][^"']*\b(info|success|warning|danger)\b[^"']*["']/i,
  )?.[1];

  switch (explicitVariant?.toLowerCase()) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "danger":
      return "danger";
    default:
      return "info";
  }
}

function getNodeText(node: MarkdownTreeNode): string {
  if (typeof node.value === "string") {
    return node.value;
  }

  return node.children?.map(getNodeText).join("") ?? "";
}

function getLeadingIcon(value: string) {
  const trimmed = value.trimStart();
  const match = trimmed.match(LEADING_ICON_PATTERN);

  if (!match) {
    return null;
  }

  const remainder = trimmed.slice(match[0].length);

  return remainder.length === 0 || /^\s/.test(remainder) ? match[0] : null;
}

function normalizeCalloutContent(source: string) {
  const innerMarkdown = source.trim();
  const tree = markdownParser.parse(innerMarkdown) as Root;
  normalizeEscapedEmphasis(tree, innerMarkdown);
  const firstNode = tree.children[0] as MarkdownTreeNode | undefined;

  if (!firstNode || firstNode.type !== "paragraph") {
    return { innerMarkdown };
  }

  const firstStart = firstNode.position?.start?.offset;
  const firstEnd = firstNode.position?.end?.offset;
  const firstSource =
    firstStart !== undefined && firstEnd !== undefined
      ? innerMarkdown.slice(firstStart, firstEnd)
      : "";
  const icon = getLeadingIcon(getNodeText(firstNode).trim());

  if (!icon) {
    return { innerMarkdown };
  }

  if (getNodeText(firstNode).trim() === icon) {
    const nextNode = tree.children[1] as MarkdownTreeNode | undefined;
    const nextStart = nextNode?.position?.start?.offset;

    if (
      !nextNode ||
      nextStart === undefined ||
      getNodeText(nextNode).trim().length === 0
    ) {
      return { innerMarkdown };
    }

    return {
      icon,
      innerMarkdown: innerMarkdown.slice(nextStart).trim(),
    };
  }

  const sourceIcon = getLeadingIcon(firstSource);

  if (!sourceIcon) {
    return { innerMarkdown };
  }

  const iconStart = firstStart ?? 0;
  const leadingWhitespace = firstSource.length - firstSource.trimStart().length;
  const iconEnd = iconStart + leadingWhitespace + sourceIcon.length;

  return {
    icon: sourceIcon,
    innerMarkdown: innerMarkdown.slice(iconEnd).trim(),
  };
}

function parseCallout(source: string) {
  const match = source.match(/^\s*(<aside\b([^>]*)>)([\s\S]*?)<\/aside>\s*$/i);

  if (!match) {
    return null;
  }

  const normalized = normalizeCalloutContent(match[3]);

  return {
    openingTag: match[1],
    innerMarkdown: normalized.innerMarkdown,
    icon: normalized.icon,
    variant: getCalloutVariant(match[2]),
  };
}

function findCalloutRanges(markdown: string) {
  const ranges: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  let activeFence: string | null = null;

  while (cursor < markdown.length) {
    const lineEnd = markdown.indexOf("\n", cursor);
    const nextLineStart = lineEnd === -1 ? markdown.length : lineEnd + 1;
    const line = markdown.slice(cursor, lineEnd === -1 ? markdown.length : lineEnd);
    const fenceMatch = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/);

    if (fenceMatch) {
      const fence = fenceMatch[1];

      if (!activeFence) {
        activeFence = fence;
      } else if (fence[0] === activeFence[0] && fence.length >= activeFence.length) {
        activeFence = null;
      }

      cursor = nextLineStart;
      continue;
    }

    if (!activeFence) {
      const openingMatch = line.match(/^[ \t]{0,3}<aside\b[^>]*>/i);

      if (openingMatch) {
        const start = cursor + openingMatch[0].indexOf("<");
        const closingMatch = /<\/aside\s*>/i.exec(markdown.slice(start));

        if (closingMatch) {
          const end = start + closingMatch.index + closingMatch[0].length;

          ranges.push({ start, end });
          cursor = end;
          continue;
        }
      }
    }

    cursor = nextLineStart;
  }

  return ranges;
}

function makeBlockId(node: RootContent, index: number) {
  return `${node.type}-${index}`;
}

function containsRawHtml(node: unknown): boolean {
  if (!node || typeof node !== "object") {
    return false;
  }

  const candidate = node as { type?: string; children?: unknown[] };

  if (candidate.type === "html") {
    return true;
  }

  return candidate.children?.some(containsRawHtml) ?? false;
}

function makeBlock(
  node: RootContent,
  source: string,
  start: number,
  end: number,
  index: number,
): DocumentBlock {
  const callout = node.type === "html" ? parseCallout(source) : null;
  const kind = callout
    ? "callout"
    : containsRawHtml(node)
      ? "unsupported"
      : getBlockKind(node);
  const editable = kind !== "unsupported" && kind !== "definition";

  return {
    id: makeBlockId(node, index),
    kind,
    node,
    source,
    range: { start, end },
    editable,
    keepWithNext: kind === "heading",
    callout: callout ?? undefined,
  };
}

export function parseMarkdownDocument(markdown: string): ParsedMarkdownDocument {
  const blocks: DocumentBlock[] = [];
  const definitions: string[] = [];
  let blockIndex = 0;

  const parseSegment = (start: number, end: number) => {
    const segment = markdown.slice(start, end);
    const tree = markdownParser.parse(segment) as Root;
    normalizeEscapedEmphasis(tree, segment);

    tree.children.forEach((node) => {
      const segmentStart = getOffset(node, "start");
      const segmentEnd = getOffset(node, "end");

      if (segmentStart === undefined || segmentEnd === undefined) {
        return;
      }

      const sourceStart = start + segmentStart;
      const sourceEnd = start + segmentEnd;
      const source = markdown.slice(sourceStart, sourceEnd);
      const block = makeBlock(
        node,
        source,
        sourceStart,
        sourceEnd,
        blockIndex,
      );

      blockIndex += 1;

      if (block.kind === "definition") {
        definitions.push(source);
        return;
      }

      blocks.push(block);
    });
  };
  let cursor = 0;

  findCalloutRanges(markdown).forEach((range) => {
    parseSegment(cursor, range.start);

    const source = markdown.slice(range.start, range.end);
    const calloutNode = { type: "html", value: source } as RootContent;
    const block = makeBlock(
      calloutNode,
      source,
      range.start,
      range.end,
      blockIndex,
    );

    blockIndex += 1;
    blocks.push(block);
    cursor = range.end;
  });

  parseSegment(cursor, markdown.length);

  return { blocks, definitions };
}
