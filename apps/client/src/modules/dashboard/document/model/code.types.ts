export type CodeLineSourceRange = {
  index: number;
  from: number;
  to: number;
};

export type CodeLayoutMetadata = {
  openingIndent: string;
  openingFence: string;
  info: string;
  openingLineEnding: string;
  closingIndent: string;
  closingFence: string;
  closingSuffix: string;
  /** Normalized code value without the renderer-owned terminal newline. */
  content: string;
  /** Text expected from the canonical pre > code renderer. */
  renderedContent: string;
  contentRange: {
    from: number;
    to: number;
  };
  lines: CodeLineSourceRange[];
};
