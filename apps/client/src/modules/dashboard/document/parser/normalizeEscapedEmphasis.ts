type MarkdownNode = {
  type?: string;
  value?: string;
  children?: MarkdownNode[];
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

function normalizeNode(node: MarkdownNode, source: string) {
  if (node.type === "paragraph" && node.children) {
    const [first, second] = node.children;
    const firstStart = first?.position?.start?.offset;
    const firstEnd = first?.position?.end?.offset;
    const secondStart = second?.position?.start?.offset;

    if (
      first?.type === "text" &&
      first.value === "*" &&
      second?.type === "emphasis" &&
      firstStart !== undefined &&
      firstEnd !== undefined &&
      secondStart === firstEnd &&
      source.slice(firstStart, firstEnd) === "\\*" &&
      source[secondStart] === "*"
    ) {
      node.children.shift();
    }
  }

  node.children?.forEach((child) => normalizeNode(child, source));
}

export function normalizeEscapedEmphasis(tree: MarkdownNode, source: string) {
  normalizeNode(tree, source);
}

export function remarkNormalizeEscapedEmphasis() {
  return (tree: MarkdownNode, file: { toString(): string }) => {
    normalizeEscapedEmphasis(tree, file.toString());
  };
}
