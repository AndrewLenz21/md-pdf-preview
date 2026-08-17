import { mergeAttributes, Node } from "@tiptap/core";

export const BlankSpace = Node.create({
  name: "blankSpace",
  group: "block",
  content: "inline*",
  selectable: false,

  addAttributes() {
    return {
      lineCount: {
        default: 0,
      },
      source: {
        default: "",
      },
      group: {
        default: "",
      },
      lineEnding: {
        default: "\n",
      },
      normalLineCount: {
        default: 2,
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-document-blank-space]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        {
          class: "document-blank-space",
          "data-document-blank-space": "true",
          "data-document-blank-line-count": node.attrs.lineCount,
          "data-document-blank-group": node.attrs.group,
          "data-document-blank-line-ending": node.attrs.lineEnding,
          "data-document-blank-normal-lines": node.attrs.normalLineCount,
          "data-source": node.attrs.source,
          style: `--document-blank-line-count: ${node.attrs.lineCount}`,
        },
        HTMLAttributes,
      ),
      0,
    ];
  },
});
