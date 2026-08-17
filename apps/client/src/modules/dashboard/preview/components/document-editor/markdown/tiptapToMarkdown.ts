import type { Editor } from "@tiptap/core";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

function getCodeLanguage(node: Element) {
  const code = node.querySelector("code");
  const className = code?.getAttribute("class") ?? "";
  const language = className.match(/(?:^|\s)language-([^\s]+)/)?.[1];

  return language ?? "";
}

type BlankSpaceTokenGroup = {
  lineEnding: string;
  normalLineCount: number;
  source: string;
  tokens: string[];
};

function createMarkdownSerializer(
  blankSpaceTokens: Map<string, BlankSpaceTokenGroup>,
) {
  const service = new TurndownService({
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    headingStyle: "atx",
    strongDelimiter: "**",
  });
  let blankSpaceTokenIndex = 0;

  service.use(gfm);
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
        .join("\n\n");

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

export function tiptapToMarkdown(editor: Editor) {
  const blankSpaceTokens = new Map<string, BlankSpaceTokenGroup>();
  const editorHTML = editor
    .getHTML()
    .replace(
      /(<div\b[^>]*data-document-blank-space[^>]*>)<\/div>/g,
      "$1<br></div>",
    );
  const markdown = createMarkdownSerializer(blankSpaceTokens).turndown(
    editorHTML,
  );
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
      const tokenSequence = group.tokens.join("\n\n");

      return value
        .replace(`\n\n${tokenSequence}\n\n`, source)
        .replace(tokenSequence, source);
    },
    markdown,
  );

  return restoredMarkdown
    .replace(/^(\s*)-\s{2,}/gm, "$1- ")
    .replace(/^(\s*)(\d+)\.\s{2,}/gm, "$1$2. ")
    .trim();
}
