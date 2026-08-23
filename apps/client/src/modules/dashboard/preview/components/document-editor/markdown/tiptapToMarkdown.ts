import type { Editor } from "@tiptap/core";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

function getCodeLanguage(node: Element) {
  const code = node.querySelector("code");
  const className =
    code?.getAttribute("class") ?? node.getAttribute("class") ?? "";
  const language = className.match(/(?:^|\s)language-([^\s]+)/)?.[1];

  return language ?? "";
}

function serializeTableCell(service: TurndownService, cell: HTMLTableCellElement) {
  return service
    .turndown(cell.innerHTML)
    .replace(/\s+/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

function serializeTable(service: TurndownService, node: Element) {
  const rows = Array.from((node as HTMLTableElement).rows);

  if (rows.length === 0) {
    return "";
  }

  const getCells = (row: HTMLTableRowElement) =>
    Array.from(row.cells).map((cell) => serializeTableCell(service, cell));
  const header = getCells(rows[0]);
  const separator = header.map(() => "---");
  const body = rows.slice(1).map(getCells);
  const lines = [header, separator, ...body].map(
    (cells) => `| ${cells.join(" | ")} |`,
  );

  return `\n\n${lines.join("\n")}\n\n`;
}

type BlankSpaceTokenGroup = {
  lineEnding: string;
  normalLineCount: number;
  source: string;
  tokens: string[];
};

type EmptyParagraphTokenState = {
  tokens: string[];
};

type EmptyListBreakTokenState = {
  tokens: string[];
};

function createMarkdownSerializer(
  blankSpaceTokens: Map<string, BlankSpaceTokenGroup>,
  emptyParagraphTokens: EmptyParagraphTokenState,
  emptyListBreakTokens: EmptyListBreakTokenState,
) {
  const service = new TurndownService({
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    headingStyle: "atx",
    strongDelimiter: "**",
  });
  let blankSpaceTokenIndex = 0;
  let emptyParagraphTokenIndex = 0;

  service.use(gfm);
  service.addRule("documentTable", {
    filter: "table",
    replacement: (_content, node) => serializeTable(service, node),
  });
  service.addRule("documentBlankSpace", {
    filter: (node) =>
      node.nodeName === "DIV" && node.hasAttribute("data-document-blank-space"),
    replacement: (_content, node) => {
      const group = node.getAttribute("data-document-blank-group") ?? "";
      const token = `__DOCUMENT_BLANK_SPACE_${blankSpaceTokenIndex++}__`;
      const tokenGroup = blankSpaceTokens.get(group) ?? {
        lineEnding:
          node.getAttribute("data-document-blank-line-ending") ?? "\n",
        normalLineCount: Number.parseInt(
          node.getAttribute("data-document-blank-normal-lines") ?? "2",
          10,
        ),
        source: node.getAttribute("data-source") ?? "",
        tokens: [],
      };
      tokenGroup.tokens.push(token);
      blankSpaceTokens.set(group, tokenGroup);
      return token;
    },
  });
  service.addRule("documentEmptyParagraph", {
    filter: (node) =>
      node.nodeName === "P" &&
      node.hasAttribute("data-document-empty-paragraph"),
    replacement: () => {
      const token = `__DOCUMENT_EMPTY_PARAGRAPH_${emptyParagraphTokenIndex++}__`;
      emptyParagraphTokens.tokens.push(token);
      return `${token}\n\n`;
    },
  });
  service.addRule("documentEmptyListBreak", {
    filter: (node) =>
      node.nodeName === "P" && node.hasAttribute("data-document-list-break"),
    replacement: () => {
      const token = `__DOCUMENT_EMPTY_LIST_BREAK_${emptyListBreakTokens.tokens.length}__`;
      emptyListBreakTokens.tokens.push(token);
      return `${token}\n\n`;
    },
  });
  service.addRule("documentSourceBlock", {
    filter: (node) =>
      node.nodeName === "PRE" && node.hasAttribute("data-document-source"),
    replacement: (_content, node) =>
      `\n\n${(node as HTMLElement).dataset.source ?? ""}\n\n`,
  });
  service.addRule("documentCallout", {
    filter: (node) =>
      node.nodeName === "ASIDE" && node.hasAttribute("data-callout"),
    replacement: (content, node) => {
      const element = node as HTMLElement;
      const variant = element.dataset.variant;
      const attribute = variant && variant !== "info" ? ` data-variant="${variant}"` : "";
      const icon = element.querySelector("[data-callout-icon]")?.textContent?.trim();
      const contentElement = element.querySelector("[data-callout-content]");
      const innerMarkdown = contentElement
        ? service.turndown(contentElement.innerHTML).trim()
        : content.trim();
      const calloutContent = [icon, innerMarkdown]
        .filter((part) => part && part.length > 0)
        .join(" ");

      return `\n\n<aside${attribute}>\n${calloutContent}\n</aside>\n\n`;
    },
  });
  service.addRule("documentTaskList", {
    filter: (node) =>
      node.nodeName === "UL" &&
      (node as HTMLElement).dataset.type === "taskList",
    replacement: (_content, node) => {
      const items = Array.from((node as HTMLElement).children).filter(
        (child) => child.nodeName === "LI",
      );

      return items
        .map((item) => {
          const contentElement = Array.from(item.children).find(
            (child) => child.nodeName === "DIV",
          );
          const itemMarkdown = contentElement
            ? service.turndown(contentElement.innerHTML).trim()
            : "";
          const indentedContinuation = itemMarkdown
            .split("\n")
            .map((line, index) => (index === 0 || line.length === 0 ? line : `    ${line}`))
            .join("\n");
          const marker = item.getAttribute("data-checked") === "true" ? "[x]" : "[ ]";

          return `- ${marker} ${indentedContinuation}`.trimEnd();
        })
        .join("\n");
    },
  });
  service.addRule("documentCodeBlock", {
    filter: (node) =>
      node.nodeName === "PRE" && !node.hasAttribute("data-document-source"),
    replacement: (_content, node) => {
      const source = node.textContent ?? "";
      const language = getCodeLanguage(node);

      return `\n\n\`\`\`${language}\n${source.replace(/\n$/, "")}\n\`\`\`\n\n`;
    },
  });

  return service;
}

function normalizeListSpacing(markdown: string) {
  return markdown
    .replace(/^(\s*)-\s{2,}/gm, "$1- ")
    .replace(/^(\s*)(\d+)\.\s{2,}/gm, "$1$2. ")
    .replace(
      /(^[ \t]*(?:[-+*]|\d+[.)]) [^\n]*)\n[ \t]*\n(?=[ \t]*(?:[-+*]|\d+[.)]) [^\n]*$)/gm,
      "$1\n",
    )
    .replace(
      /(^[ \t]*(?:[-+*]|\d+[.)]) [^\n]*)\n[ \t]+\n(?=\n)/gm,
      "$1\n",
    )
    .trim();
}

function removeSyntheticTrailingParagraph(html: string) {
  return html.replace(
    /<p(?:\s[^>]*)?>(?:<br\s*\/?>)?<\/p>\s*$/,
    "",
  );
}

function markEmptyParagraphs(html: string) {
  return html.replace(
    /<p>(?:<br\s*\/?>)?<\/p>/g,
    '<p data-document-empty-paragraph="true"><br></p>',
  );
}

function preserveEmptyListBreaks(html: string, ownerDocument: Document) {
  const container = ownerDocument.createElement("div");
  container.innerHTML = html;

  container.querySelectorAll("ul, ol").forEach((list) => {
    const nextBlock = list.nextElementSibling;
    const lastItem = list.lastElementChild;
    const lastItemText = lastItem?.textContent?.replace(/\u200b/g, "").trim();

    if (
      !nextBlock ||
      !lastItem ||
      lastItem.nodeName !== "LI" ||
      lastItemText ||
      lastItem.querySelector("ul, ol")
    ) {
      return;
    }

    lastItem.remove();

    const emptyParagraph = ownerDocument.createElement("p");
    emptyParagraph.setAttribute("data-document-list-break", "true");
    emptyParagraph.innerHTML = "<br>";
    list.after(emptyParagraph);
  });

  return container.innerHTML;
}

function restoreEmptyParagraphTokens(
  markdown: string,
  tokens: string[],
) {
  if (tokens.length === 0) {
    return markdown;
  }

  const tokenPattern = tokens.join("|");
  const tokenMatcher = new RegExp(
    `\\n\\n((?:${tokenPattern})(?:\\n\\n(?:${tokenPattern}))*)\\n\\n`,
    "g",
  );

  const restored = markdown.replace(tokenMatcher, (_match, sequence: string) => {
    const tokenCount =
      sequence.match(/__DOCUMENT_EMPTY_PARAGRAPH_\d+__/g)?.length ?? 0;
    return "\n".repeat(tokenCount + 2);
  });

  return restored.replace(new RegExp(tokenPattern, "g"), "\n");
}

function restoreEmptyListBreakTokens(
  markdown: string,
  tokens: string[],
) {
  if (tokens.length === 0) {
    return markdown;
  }

  const tokenPattern = tokens.join("|");
  const tokenMatcher = new RegExp(
    `\\n\\n((?:${tokenPattern})(?:\\n\\n(?:${tokenPattern}))*)\\n\\n`,
    "g",
  );

  const restored = markdown.replace(tokenMatcher, (_match, sequence: string) => {
    const tokenCount =
      sequence.match(/__DOCUMENT_EMPTY_LIST_BREAK_\d+__/g)?.length ?? 0;

    return "\n".repeat(tokenCount + 2);
  });

  return restored.replace(new RegExp(tokenPattern, "g"), "\n");
}

export function tiptapToMarkdown(editor: Editor) {
  const blankSpaceTokens = new Map<string, BlankSpaceTokenGroup>();
  const emptyParagraphTokens: EmptyParagraphTokenState = { tokens: [] };
  const emptyListBreakTokens: EmptyListBreakTokenState = { tokens: [] };
  const ownerDocument = editor.view.dom.ownerDocument;
  const editorHTML = removeSyntheticTrailingParagraph(
    markEmptyParagraphs(
      preserveEmptyListBreaks(
        editor.getHTML().replace(
          /(<div\b[^>]*data-document-blank-space[^>]*>)<\/div>/g,
          "$1<br></div>",
        ),
        ownerDocument,
      ),
    ),
  );
  const markdown = createMarkdownSerializer(
    blankSpaceTokens,
    emptyParagraphTokens,
    emptyListBreakTokens,
  ).turndown(editorHTML);
  const restoredMarkdown = [...blankSpaceTokens.values()].reduce(
    (value, group) => {
      const originalLineCount = (
        group.source.match(/\r\n|\r|\n/g) ?? []
      ).length;
      const expectedExtraLineCount = originalLineCount - group.normalLineCount;
      const source =
        group.source.length > 0 && expectedExtraLineCount === group.tokens.length
          ? group.source
          : group.lineEnding.repeat(
              group.normalLineCount + group.tokens.length,
            );
      const tokenSequence = group.tokens.join("");

      return value
        .replace(`\n\n${tokenSequence}\n\n`, source)
        .replace(tokenSequence, source);
    },
    markdown,
  );

  const restoredEmptyParagraphs = restoreEmptyParagraphTokens(
    restoredMarkdown,
    emptyParagraphTokens.tokens,
  );
  const restoredEmptyListBreaks = restoreEmptyListBreakTokens(
    restoredEmptyParagraphs,
    emptyListBreakTokens.tokens,
  );

  return normalizeListSpacing(restoredEmptyListBreaks);
}
