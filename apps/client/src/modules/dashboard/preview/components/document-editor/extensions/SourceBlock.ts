import { mergeAttributes, Node } from "@tiptap/core";

export const SourceBlock = Node.create({
  name: "sourceBlock",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      source: {
        default: "",
      },
      kind: {
        default: "unsupported",
      },
    };
  },

  parseHTML() {
    return [{ tag: "pre[data-document-source]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(
        {
          class: "document-unsupported-block",
          "data-document-source": node.attrs.kind,
          "data-source": node.attrs.source,
          contenteditable: "false",
        },
        HTMLAttributes,
      ),
      ["code", {}, node.attrs.source],
    ];
  },
});
