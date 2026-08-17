import { mergeAttributes, Node } from "@tiptap/core";

const CALLOUT_VARIANTS = new Set(["info", "success", "warning", "danger"]);

function getVariant(element: HTMLElement) {
  const explicitVariant =
    element.dataset.variant ??
    element.className.match(/\b(info|success|warning|danger)\b/i)?.[1];

  return explicitVariant && CALLOUT_VARIANTS.has(explicitVariant.toLowerCase())
    ? explicitVariant.toLowerCase()
    : "info";
}

function getIcon(element: HTMLElement) {
  return element.querySelector<HTMLElement>("[data-callout-icon]")?.textContent?.trim() || null;
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block*",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (element: HTMLElement) => getVariant(element),
        renderHTML: (attributes: { variant: string }) => ({
          "data-variant": attributes.variant,
        }),
      },
      icon: {
        default: null,
        parseHTML: (element: HTMLElement) => getIcon(element),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "aside",
        contentElement: ".document-callout-content",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const icon = typeof node.attrs.icon === "string" ? node.attrs.icon : null;
    const iconNode = icon
      ? [
          "span",
          {
            class: "document-callout-icon",
            "data-callout-icon": "true",
            contenteditable: "false",
          },
          icon,
        ]
      : null;

    return [
      "aside",
      mergeAttributes(
        {
          class: `document-callout document-callout-${node.attrs.variant}${icon ? " document-callout-has-icon" : ""}`,
          "data-callout": "true",
        },
        HTMLAttributes,
      ),
      ...(iconNode ? [iconNode] : []),
      ["div", { class: "document-callout-content", "data-callout-content": "true" }, 0],
    ];
  },
});
