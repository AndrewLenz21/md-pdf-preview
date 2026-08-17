import type { RootContent } from "mdast";

export type DocumentBlockKind =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "code"
  | "blockquote"
  | "thematicBreak"
  | "callout"
  | "definition"
  | "unsupported";

export type CalloutVariant = "info" | "success" | "warning" | "danger";

export type SourceRange = {
  start: number;
  end: number;
};

export type DocumentCallout = {
  openingTag: string;
  innerMarkdown: string;
  icon?: string;
  variant: CalloutVariant;
};

export type DocumentBlock = {
  id: string;
  kind: DocumentBlockKind;
  node: RootContent;
  source: string;
  range: SourceRange;
  editable: boolean;
  keepWithNext: boolean;
  callout?: DocumentCallout;
};

export type ParsedMarkdownDocument = {
  blocks: DocumentBlock[];
  definitions: string[];
};
