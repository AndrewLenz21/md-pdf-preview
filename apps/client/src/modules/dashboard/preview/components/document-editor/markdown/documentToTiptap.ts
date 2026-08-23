import type { JSONContent } from "@tiptap/core";

import type { DocumentBlock } from "@/modules/dashboard/document";

import { parseMarkdownDocument } from "@/modules/dashboard/document";

type MarkdownNode = {
  type: string;
  value?: string;
  depth?: number;
  ordered?: boolean;
  start?: number;
  checked?: boolean | null;
  lang?: string | null;
  url?: string;
  title?: string | null;
  alt?: string | null;
  children?: MarkdownNode[];
};

function withMarks(content: JSONContent[], marks: JSONContent["marks"]) {
  return content.map((item) =>
    item.type === "text" && marks && marks.length > 0
      ? { ...item, marks: [...(item.marks ?? []), ...marks] }
      : item,
  );
}

function inlineContent(node: MarkdownNode): JSONContent[] {
  const children = node.children?.flatMap(inlineContent) ?? [];

  switch (node.type) {
    case "text":
      return [{ type: "text", text: node.value ?? "" }];
    case "strong":
      return withMarks(children, [{ type: "bold" }]);
    case "emphasis":
      return withMarks(children, [{ type: "italic" }]);
    case "delete":
      return withMarks(children, [{ type: "strike" }]);
    case "inlineCode":
      return [{ type: "text", text: node.value ?? "", marks: [{ type: "code" }] }];
    case "link":
      return withMarks(children, [
        {
          type: "link",
          attrs: { href: node.url ?? "", target: "_blank", rel: "noopener noreferrer" },
        },
      ]);
    case "image":
      return [
        {
          type: "image",
          attrs: {
            src: node.url ?? "",
            alt: node.alt ?? "",
            title: node.title ?? null,
          },
        },
      ];
    case "break":
      return [{ type: "hardBreak" }];
    default:
      return children;
  }
}

function hasVisibleContent(content: JSONContent[]) {
  return content.some(
    (item) => item.type !== "text" || (item.text ?? "").trim().length > 0,
  );
}

function splitInlineBlocks(content: JSONContent[]): JSONContent[] {
  const blocks: JSONContent[] = [];
  let paragraph: JSONContent[] = [];

  const flushParagraph = () => {
    if (hasVisibleContent(paragraph)) {
      blocks.push({ type: "paragraph", content: paragraph });
    }

    paragraph = [];
  };

  content.forEach((item) => {
    if (item.type === "image") {
      flushParagraph();
      blocks.push(item);
      return;
    }

    paragraph.push(item);
  });

  flushParagraph();

  return blocks;
}

function paragraphBlocks(node: MarkdownNode): JSONContent[] {
  const blocks = splitInlineBlocks(node.children?.flatMap(inlineContent) ?? []);

  return blocks.length > 0 ? blocks : [{ type: "paragraph" }];
}

function tableContent(node: MarkdownNode): JSONContent {
  const rows = node.children ?? [];

  return {
    type: "table",
    content: rows.map((row, rowIndex) => ({
      type: "tableRow",
      content: (row.children ?? []).map((cell) => ({
        type: rowIndex === 0 ? "tableHeader" : "tableCell",
        content: paragraphBlocks(cell),
      })),
    })),
  };
}

function blockContent(node: MarkdownNode): JSONContent[] | null {
  switch (node.type) {
    case "paragraph":
      return paragraphBlocks(node);
    case "heading":
      return [
        {
          type: "heading",
          attrs: { level: Math.min(Math.max(node.depth ?? 1, 1), 6) },
          content: node.children?.flatMap(inlineContent),
        },
      ];
    case "blockquote":
      return [
        {
          type: "blockquote",
          content: node.children?.flatMap(
            (child) => blockContent(child) ?? [],
          ),
        },
      ];
    case "list": {
      const isTaskList =
        node.children?.some(
          (item) => item.checked !== undefined && item.checked !== null,
        ) ?? false;
      const itemType = isTaskList ? "taskItem" : "listItem";
      const content = node.children?.map((item) => ({
        type: itemType,
        attrs: isTaskList ? { checked: item.checked === true } : undefined,
        content: item.children?.flatMap(
          (child) => blockContent(child) ?? [],
        ),
      }));

      return [
        {
          type: isTaskList
            ? "taskList"
            : node.ordered
              ? "orderedList"
              : "bulletList",
          attrs: node.ordered ? { start: node.start ?? 1 } : undefined,
          content,
        },
      ];
    }
    case "code":
      return [
        {
          type: "codeBlock",
          attrs: { language: node.lang ?? null },
          content: node.value ? [{ type: "text", text: node.value }] : undefined,
        },
      ];
    case "thematicBreak":
      return [{ type: "horizontalRule" }];
    case "table":
      return [tableContent(node)];
    default:
      return null;
  }
}

function blockToContent(block: DocumentBlock): JSONContent[] {
  if (block.kind === "callout" && block.callout) {
    const innerBlocks = parseMarkdownDocument(block.callout.innerMarkdown).blocks;

    return [
      {
        type: "callout",
        attrs: {
          icon: block.callout.icon ?? null,
          variant: block.callout.variant,
        },
        content: innerBlocks.flatMap(blockToContent),
      },
    ];
  }

  if (!block.editable) {
    return [
      {
        type: "sourceBlock",
        attrs: { source: block.source, kind: block.kind },
      },
    ];
  }

  return blockContent(block.node as MarkdownNode) ?? [
    {
      type: "sourceBlock",
      attrs: { source: block.source, kind: block.kind },
    },
  ];
}

function getBlankSpaceContent(
  markdown: string,
  from: number,
  to: number,
  boundary: "leading" | "between" | "trailing",
) {
  const source = markdown.slice(from, to);
  const lineCount = (source.match(/\r\n|\r|\n/g) ?? []).length;
  const normalLineCount = boundary === "between" ? 2 : 1;
  const extraLineCount = lineCount - normalLineCount;
  const lineEnding = source.match(/\r\n|\r|\n/)?.[0] ?? "\n";
  const group = `blank-space-${from}-${to}`;

  return extraLineCount > 0
    ? Array.from({ length: extraLineCount }, (_, index) => ({
        type: "blankSpace",
        attrs: {
          group,
          lineCount: 1,
          lineEnding,
          normalLineCount,
          source: index === 0 ? source : "",
        },
      }))
    : [];
}

function documentContent(markdown: string, blocks: DocumentBlock[]) {
  const content: JSONContent[] = [];
  const firstBlock = blocks[0];

  if (!firstBlock) {
    return content;
  }

  const leadingSpace = getBlankSpaceContent(
    markdown,
    0,
    firstBlock.range.start,
    "leading",
  );

  content.push(...leadingSpace);

  blocks.forEach((block, index) => {
    content.push(...blockToContent(block));

    const nextBlock = blocks[index + 1];
    const gap = nextBlock
      ? getBlankSpaceContent(
          markdown,
          block.range.end,
          nextBlock.range.start,
          "between",
        )
      : getBlankSpaceContent(
          markdown,
          block.range.end,
          markdown.length,
          "trailing",
        );

    content.push(...gap);
  });

  return content;
}

export function markdownToTiptapDocument(markdown: string): JSONContent {
  const parsed = parseMarkdownDocument(markdown);
  const content = documentContent(markdown, parsed.blocks);

  parsed.definitions.forEach((source) => {
    content.push({
      type: "sourceBlock",
      attrs: { source, kind: "definition" },
    });
  });

  return {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };
}
