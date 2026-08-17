import type { DocumentBlock } from "@/modules/dashboard/document/model/document-block.types";
import type { Editor } from "@tiptap/core";

import type { PageFragment } from "../components/paper-preview/pagination/pagination.types";

type MarkdownListItem = {
  children?: Array<{
    type?: string;
    children?: Array<{ type?: string }>;
  }>;
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

type MarkdownList = {
  children?: MarkdownListItem[];
};

type PreviewListItemRange = {
  index: number;
  from: number;
  to: number;
};

export type PreviewListItem = {
  index: number;
  from: number;
  to: number;
  textFrom: number;
  textTo: number;
  prefix: string;
  nextPrefix: string;
};

export type PreviewListSelection = {
  item: PreviewListItem;
  text: string;
  textOffset: number;
};

function getSourcePrefix(fragment: PageFragment, parentBlock: DocumentBlock) {
  if (parentBlock.kind !== "heading") {
    return "";
  }

  return fragment.source.match(/^[ \t]{0,3}#{1,6}[ \t]+/)?.[0] ?? "";
}

export function isPlainEditableBlock(block: DocumentBlock) {
  if (block.kind === "list") {
    return getPreviewListItems(block).length > 0;
  }

  if (block.kind !== "paragraph" && block.kind !== "heading") {
    return false;
  }

  const children = (block.node as { children?: Array<{ type?: string }> })
    .children;

  return children?.every((child) => child.type === "text") ?? false;
}

function getListItemPrefix(source: string) {
  const firstLineEnd = source.search(/\r?\n/);
  const firstLine = firstLineEnd === -1 ? source : source.slice(0, firstLineEnd);
  const match = firstLine.match(
    /^([ \t]*)([-+*]|\d+[.)])([ \t]+)(\[[ xX]\][ \t]+)?/,
  );

  if (!match) {
    return null;
  }

  const indentation = match[1];
  const marker = match[2];
  const spacing = match[3];
  const taskPrefix = match[4];
  const nextMarker = /^\d/.test(marker)
    ? `${Number.parseInt(marker, 10) + 1}${marker.at(-1)}`
    : marker;
  const nextTaskPrefix = taskPrefix ? "[ ] " : "";

  return {
    prefix: match[0],
    nextPrefix: `${indentation}${nextMarker}${spacing}${nextTaskPrefix}`,
    textLength: firstLine.length - match[0].length,
  };
}

function isPlainTopLevelListItem(item: MarkdownListItem) {
  const [firstChild, ...remainingChildren] = item.children ?? [];

  return (
    firstChild?.type === "paragraph" &&
    firstChild.children?.every((child) => child.type === "text") &&
    remainingChildren.every((child) => child.type === "list")
  );
}

export function getPreviewListItems(block: DocumentBlock): PreviewListItem[] {
  if (block.kind !== "list") {
    return [];
  }

  const list = block.node as MarkdownList;

  return (list.children ?? []).flatMap((item, index) => {
    const start = item.position?.start?.offset;
    const end = item.position?.end?.offset;

    if (
      start === undefined ||
      end === undefined ||
      !isPlainTopLevelListItem(item)
    ) {
      return [];
    }

    const from = start - block.range.start;
    const to = end - block.range.start;
    const source = block.source.slice(from, to);
    const prefix = getListItemPrefix(source);

    if (!prefix) {
      return [];
    }

    return [
      {
        index,
        from,
        to,
        textFrom: from + prefix.prefix.length,
        textTo: from + prefix.prefix.length + prefix.textLength,
        prefix: prefix.prefix,
        nextPrefix: prefix.nextPrefix,
      },
    ];
  });
}

function getPreviewListItemRanges(block: DocumentBlock): PreviewListItemRange[] {
  if (block.kind !== "list") {
    return [];
  }

  return ((block.node as MarkdownList).children ?? []).flatMap((item, index) => {
    const start = item.position?.start?.offset;
    const end = item.position?.end?.offset;

    return start !== undefined && end !== undefined
      ? [
          {
            index,
            from: start - block.range.start,
            to: end - block.range.start,
          },
        ]
      : [];
  });
}

export function isEditablePreviewFragment(
  fragment: PageFragment,
  parentBlock: DocumentBlock,
) {
  if (parentBlock.kind === "list") {
    const fragmentItems = getPreviewListItemRanges(parentBlock).filter(
      (item) =>
        item.from >= fragment.sourceRange.from &&
        item.to <= fragment.sourceRange.to,
    );
    const editableItemIndexes = new Set(
      getPreviewListItems(parentBlock).map((item) => item.index),
    );

    return (
      parentBlock.editable &&
      fragment.kind === "list" &&
      fragmentItems.length > 0 &&
      fragmentItems.every((item) => editableItemIndexes.has(item.index))
    );
  }

  return (
    parentBlock.editable &&
    fragment.kind === parentBlock.kind
  );
}

export function getEditableTextRoot(root: HTMLElement) {
  const editorRoot = root.querySelector<HTMLElement>(
    ".document-editor-content",
  );

  if (editorRoot) {
    return editorRoot;
  }

  return (
    root.querySelector<HTMLElement>(
      ".document-markdown-block > p, .document-markdown-block > h1, .document-markdown-block > h2, .document-markdown-block > h3, .document-markdown-block > h4, .document-markdown-block > h5, .document-markdown-block > h6, .document-editor-content > p, .document-editor-content > h1, .document-editor-content > h2, .document-editor-content > h3, .document-editor-content > h4, .document-editor-content > h5, .document-editor-content > h6",
    ) ?? root
  );
}

function getListRoot(root: HTMLElement) {
  return root.querySelector<HTMLElement>(
    ".document-markdown-block > ul, .document-markdown-block > ol, .document-editor-content > ul, .document-editor-content > ol",
  );
}

function focusEditableRoot(root: HTMLElement) {
  (root.querySelector<HTMLElement>('[contenteditable="true"]') ?? root).focus({
    preventScroll: true,
  });
}

function getTopLevelListItemElements(root: HTMLElement) {
  const listRoot = getListRoot(root);

  return listRoot
    ? Array.from(listRoot.children).filter(
        (child): child is HTMLLIElement => child.tagName === "LI",
      )
    : [];
}

function getListItemTextNodes(item: HTMLLIElement, listRoot: HTMLElement) {
  const nodes: Text[] = [];
  const walker = item.ownerDocument.createTreeWalker(item, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const parent = node.parentElement;

    if (parent?.closest("ul, ol") === listRoot) {
      nodes.push(node as Text);
    }

    node = walker.nextNode();
  }

  return nodes;
}

function getListItemTextOffset(
  item: HTMLLIElement,
  listRoot: HTMLElement,
  node: Node,
  offset: number,
) {
  const textNodes = getListItemTextNodes(item, listRoot);
  let textOffset = 0;

  for (const textNode of textNodes) {
    if (textNode === node || textNode.contains(node)) {
      return textOffset + offset;
    }

    textOffset += textNode.nodeValue?.length ?? 0;
  }

  return textOffset;
}

function getListItemElementAtNode(root: HTMLElement, node: Node) {
  const listRoot = getListRoot(root);
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  const item = element?.closest("li") as HTMLLIElement | null;

  if (!listRoot || !item || item.parentElement !== listRoot) {
    return null;
  }

  return { item, listRoot };
}

export function getPreviewListSelection(
  root: HTMLElement,
  fragment: PageFragment,
  parentBlock: DocumentBlock,
) {
  const selection = root.ownerDocument.getSelection();
  const anchorNode = selection?.anchorNode;

  if (!anchorNode) {
    return null;
  }

  const domItem = getListItemElementAtNode(root, anchorNode);

  if (!domItem) {
    return null;
  }

  const fragmentItems = getPreviewListItems(parentBlock).filter(
    (item) =>
      item.from >= fragment.sourceRange.from &&
      item.to <= fragment.sourceRange.to,
  );
  const itemIndex = getTopLevelListItemElements(root).indexOf(domItem.item);
  const item = fragmentItems[itemIndex];

  if (!item) {
    return null;
  }

  return {
    item,
    text: getListItemTextNodes(domItem.item, domItem.listRoot)
      .map((textNode) => textNode.nodeValue ?? "")
      .join(""),
    textOffset: getListItemTextOffset(
      domItem.item,
      domItem.listRoot,
      anchorNode,
      selection?.anchorOffset ?? 0,
    ),
  } satisfies PreviewListSelection;
}

function getTextNodes(root: Node) {
  const nodes: Text[] = [];
  const ownerDocument = root.ownerDocument ?? document;
  const walker = ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }

  return nodes;
}

export function getTextOffset(root: Node, node: Node, offset: number) {
  const ownerDocument = root.ownerDocument ?? document;
  const range = ownerDocument.createRange();

  try {
    range.selectNodeContents(root);
    range.setEnd(node, offset);
    return range.toString().length;
  } catch {
    return root.textContent?.length ?? 0;
  }
}

function getCaretRangeAtPoint(
  document: Document,
  x: number,
  y: number,
) {
  if ("caretPositionFromPoint" in document) {
    const position = (
      document as Document & {
        caretPositionFromPoint?: (x: number, y: number) => CaretPosition | null;
      }
    ).caretPositionFromPoint?.(x, y);

    if (position) {
      const range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
      return range;
    }
  }

  return document.caretRangeFromPoint?.(x, y) ?? null;
}

export function getSourceBookmarkAtPoint(
  event: React.MouseEvent<HTMLDivElement>,
  fragment: PageFragment,
  parentBlock: DocumentBlock,
) {
  const root = event.currentTarget;
  const pointRange = getCaretRangeAtPoint(
    root.ownerDocument,
    event.clientX,
    event.clientY,
  );

  if (parentBlock.kind === "list" && pointRange) {
    const selection = root.ownerDocument.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(pointRange);
    const listSelection = getPreviewListSelection(root, fragment, parentBlock);

    if (listSelection) {
      return {
        parentBlockId: parentBlock.id,
        sourceOffset: listSelection.item.textFrom + listSelection.textOffset,
        documentOffset:
          parentBlock.range.start +
          listSelection.item.textFrom +
          listSelection.textOffset,
        listItemIndex: listSelection.item.index,
      };
    }

    return null;
  }

  const textRoot = getEditableTextRoot(root);
  const renderedOffset = pointRange
    ? Math.min(
        textRoot.textContent?.length ?? 0,
        getTextOffset(textRoot, pointRange.startContainer, pointRange.startOffset),
      )
    : 0;
  const sourceOffset = Math.min(
    fragment.sourceRange.to - fragment.sourceRange.from,
    getSourcePrefix(fragment, parentBlock).length + renderedOffset,
  );

  return {
    parentBlockId: parentBlock.id,
    sourceOffset: fragment.sourceRange.from + sourceOffset,
    documentOffset: parentBlock.range.start + fragment.sourceRange.from + sourceOffset,
  } satisfies {
    parentBlockId: string;
    sourceOffset: number;
    documentOffset: number;
  };
}

export function getSourceBookmarkAtSelection(
  root: HTMLElement,
  fragment: PageFragment,
  parentBlock: DocumentBlock,
  editor?: Editor,
  sourceLength = fragment.sourceRange.to - fragment.sourceRange.from,
) {
  const selection = root.ownerDocument.getSelection();
  const textRoot = getEditableTextRoot(root);
  const anchorNode = selection?.anchorNode;

  if (!selection?.rangeCount || !anchorNode || !textRoot.contains(anchorNode)) {
    return null;
  }

  const listSelection =
    parentBlock.kind === "list"
      ? getPreviewListSelection(root, fragment, parentBlock)
      : null;

  if (listSelection) {
    return {
      parentBlockId: parentBlock.id,
      sourceOffset: listSelection.item.textFrom + listSelection.textOffset,
      documentOffset:
        parentBlock.range.start +
        listSelection.item.textFrom +
        listSelection.textOffset,
      listItemIndex: listSelection.item.index,
    };
  }

  const renderedOffset = editor
    ? editor.state.doc.textBetween(0, editor.state.selection.from, "\n\n").length
    : getTextOffset(textRoot, anchorNode, selection.anchorOffset);
  const sourceOffset = getSourcePrefix(fragment, parentBlock).length + renderedOffset;

  return {
    parentBlockId: parentBlock.id,
    sourceOffset: fragment.sourceRange.from + Math.min(sourceLength, sourceOffset),
    documentOffset:
      parentBlock.range.start +
      fragment.sourceRange.from +
      Math.min(sourceLength, sourceOffset),
  };
}

export function restoreSourceBookmark(
  root: HTMLElement,
  fragment: PageFragment,
  parentBlock: DocumentBlock,
  bookmark: { documentOffset: number },
) {
  if (fragment.kind === "blankSpace") {
    const selection = root.ownerDocument.getSelection();
    const range = root.ownerDocument.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    focusEditableRoot(root);
    selection?.removeAllRanges();
    selection?.addRange(range);
    return;
  }

  const fragmentStart = parentBlock.range.start + fragment.sourceRange.from;
  const localSourceOffset = Math.max(
    0,
    Math.min(
      fragment.sourceRange.to - fragment.sourceRange.from,
      bookmark.documentOffset - fragmentStart,
    ),
  );
  const renderedOffset = Math.max(
    0,
    localSourceOffset - getSourcePrefix(fragment, parentBlock).length,
  );
  const textRoot = getEditableTextRoot(root);

  if (parentBlock.kind === "list") {
    const localSourceOffset = bookmark.documentOffset - parentBlock.range.start;
    const fragmentItems = getPreviewListItems(parentBlock).filter(
      (item) =>
        item.from >= fragment.sourceRange.from &&
        item.to <= fragment.sourceRange.to,
    );
    const itemIndex = fragmentItems.findIndex(
      (item) =>
        localSourceOffset >= item.textFrom &&
        localSourceOffset <= item.textTo,
    );
    const listRoot = getListRoot(root);
    const listItem = getTopLevelListItemElements(root)[itemIndex];

    if (listRoot && listItem && itemIndex !== -1) {
      const item = fragmentItems[itemIndex];
      const textNodes = getListItemTextNodes(listItem, listRoot);
      let remaining = localSourceOffset - item.textFrom;

      for (const textNode of textNodes) {
        const length = textNode.nodeValue?.length ?? 0;

        if (remaining <= length) {
          const selection = root.ownerDocument.getSelection();
          const range = root.ownerDocument.createRange();
          range.setStart(textNode, remaining);
          range.collapse(true);
          focusEditableRoot(root);
          selection?.removeAllRanges();
          selection?.addRange(range);
          return;
        }

        remaining -= length;
      }

      const emptyItemContent = listItem.querySelector<HTMLElement>("p") ?? listItem;
      const selection = root.ownerDocument.getSelection();
      const range = root.ownerDocument.createRange();
      range.selectNodeContents(emptyItemContent);
      range.collapse(false);
      focusEditableRoot(root);
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }
  }

  const textNodes = getTextNodes(textRoot);
  let remaining = Math.min(renderedOffset, textRoot.textContent?.length ?? 0);

  for (const textNode of textNodes) {
    const length = textNode.nodeValue?.length ?? 0;

    if (remaining <= length) {
      const selection = root.ownerDocument.getSelection();
      const range = root.ownerDocument.createRange();
      range.setStart(textNode, remaining);
      range.collapse(true);
      focusEditableRoot(root);
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }

    remaining -= length;
  }

  const lastTextNode = textNodes.at(-1);

  const selection = root.ownerDocument.getSelection();

  if (lastTextNode) {
    const range = root.ownerDocument.createRange();
    range.setStart(lastTextNode, lastTextNode.nodeValue?.length ?? 0);
    range.collapse(true);
    focusEditableRoot(root);
    selection?.removeAllRanges();
    selection?.addRange(range);
    return;
  }

  const range = root.ownerDocument.createRange();
  range.selectNodeContents(textRoot);
  range.collapse(true);
  focusEditableRoot(root);
  selection?.removeAllRanges();
  selection?.addRange(range);
}
