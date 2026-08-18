import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { DocumentBlock } from "../model/document-block.types";
import { remarkNormalizeEscapedEmphasis } from "../parser/normalizeEscapedEmphasis";

function withDefinitions(source: string, definitions: string[]) {
  return definitions.length > 0
    ? `${source}\n\n${definitions.join("\n\n")}`
    : source;
}

function getRenderableBlockSource(block: DocumentBlock) {
  if (block.kind !== "blockquote") {
    return block.source;
  }

  return block.source.replace(/(?:\r?\n[ \t]*>[ \t]*)+(?:\r?\n)?$/, "");
}

export function MarkdownContent({
  source,
  definitions,
}: {
  source: string;
  definitions: string[];
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkNormalizeEscapedEmphasis]}
    >
      {withDefinitions(source, definitions)}
    </ReactMarkdown>
  );
}

export function DocumentBlockRenderer({
  block,
  definitions,
}: {
  block: DocumentBlock;
  definitions: string[];
}) {
  if (block.kind === "unsupported") {
    return (
      <pre className="document-unsupported-block" aria-label="Unsupported Markdown block">
        <code>{block.source}</code>
      </pre>
    );
  }

  if (block.kind === "callout" && block.callout) {
    return (
      <aside
        className={`document-callout document-callout-${block.callout.variant}${block.callout.icon ? " document-callout-has-icon" : ""}`}
        aria-label={`${block.callout.variant} callout`}
      >
        {block.callout.icon ? (
          <span className="document-callout-icon" aria-hidden="true">
            {block.callout.icon}
          </span>
        ) : null}
        <div className="document-callout-content">
          <MarkdownContent
            source={block.callout.innerMarkdown}
            definitions={definitions}
          />
        </div>
      </aside>
    );
  }

  return (
    <div className={`document-markdown-block document-block-${block.kind}`}>
      <MarkdownContent
        source={getRenderableBlockSource(block)}
        definitions={definitions}
      />
    </div>
  );
}
