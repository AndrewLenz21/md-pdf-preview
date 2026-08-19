type PageBreakMarkerListener = (positions: number[]) => void;

type TextNodeEntry = {
  node: Text;
  start: number;
  end: number;
};

type NormalizedText = {
  text: string;
  positions: number[];
};

export type PageBreakAnchor = {
  currentPhrases: string[];
  nextPhrases: string[];
};

const TEXT_BLOCK_SELECTOR =
  "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td, th";

function normalizeText(value: string): NormalizedText {
  let text = "";
  const positions: number[] = [];
  let inWhitespace = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index] ?? "";

    if (/\s/.test(character)) {
      if (text.length > 0 && !inWhitespace) {
        text += " ";
        positions.push(index);
      }

      inWhitespace = true;
      continue;
    }

    text += character.toLowerCase();
    positions.push(index);
    inWhitespace = false;
  }

  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    positions.pop();
  }

  return { text, positions };
}

function getTextEntries(root: HTMLElement) {
  const walker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
  );
  const entries: TextNodeEntry[] = [];
  let previousTextNode: Text | null = null;
  let offset = 0;
  let node = walker.nextNode();

  while (node) {
    const textNode = node as Text;
    const text = textNode.nodeValue ?? "";

    if (text.length > 0) {
      const previousBlock = previousTextNode?.parentElement?.closest(
        TEXT_BLOCK_SELECTOR,
      );
      const currentBlock = textNode.parentElement?.closest(
        TEXT_BLOCK_SELECTOR,
      );
      const needsSeparator =
        previousTextNode !== null &&
        previousBlock !== null &&
        currentBlock !== null &&
        previousBlock !== currentBlock &&
        !/^\s*$/.test(text) &&
        !/^\s*$/.test(previousTextNode.nodeValue ?? "");

      if (needsSeparator) {
        offset += 1;
      }

      entries.push({
        node: textNode,
        start: offset,
        end: offset + text.length,
      });
      offset += text.length;
      previousTextNode = textNode;
    }

    node = walker.nextNode();
  }

  return entries;
}

function getRawText(entries: TextNodeEntry[]) {
  let rawText = "";
  let offset = 0;

  entries.forEach((entry) => {
    if (entry.start > offset) {
      rawText += " ".repeat(entry.start - offset);
    }

    rawText += entry.node.nodeValue ?? "";
    offset = entry.end;
  });

  return rawText;
}

function getNormalizedDocumentText(root: HTMLElement) {
  const entries = getTextEntries(root);
  const normalized = normalizeText(getRawText(entries));

  return { entries, ...normalized };
}

function getPageHeadText(page: HTMLElement) {
  const roots = Array.from(
    page.querySelectorAll<HTMLElement>("[data-document-block-root]"),
  );

  for (const root of roots) {
    const tableBody = root.querySelector<HTMLElement>("table tbody");
    // Continued preview tables repeat their header, but the editor has only
    // one header. Anchor the break to the first body row instead.
    const firstTableRow = tableBody?.firstElementChild;
    const text = getRawText(
      getTextEntries(
        firstTableRow instanceof HTMLElement
          ? firstTableRow
          : (tableBody ?? root),
      ),
    );

    if (normalizeText(text).text.length > 0) {
      return text;
    }
  }

  return "";
}

function getPageTailText(page: HTMLElement) {
  const roots = Array.from(
    page.querySelectorAll<HTMLElement>("[data-document-block-root]"),
  );

  for (let index = roots.length - 1; index >= 0; index -= 1) {
    const root = roots[index] ?? page;
    const tableBody = root.querySelector<HTMLElement>("table tbody");
    const lastTableRow = tableBody?.lastElementChild;
    const text = getRawText(
      getTextEntries(
        lastTableRow instanceof HTMLElement
          ? lastTableRow
          : (tableBody ?? root),
      ),
    );

    if (normalizeText(text).text.length > 0) {
      return text;
    }
  }

  return "";
}

function getPhraseCandidates(value: string, edge: "start" | "end") {
  const words = normalizeText(value).text.split(" ").filter(Boolean);
  const candidates: string[] = [];

  for (const wordCount of [10, 8, 6, 4, 2]) {
    if (words.length >= wordCount) {
      candidates.push(
        edge === "start"
          ? words.slice(0, wordCount).join(" ")
          : words.slice(-wordCount).join(" "),
      );
    }
  }

  return candidates.length > 0 ? candidates : words;
}

export function getPageBreakAnchors(previewCanvas: HTMLElement) {
  const pages = Array.from(
    previewCanvas.querySelectorAll<HTMLElement>("[data-document-page]"),
  );

  return pages.slice(0, -1).flatMap((page, index) => {
    const nextPage = pages[index + 1];
    const currentText = getPageTailText(page);
    const nextText = nextPage ? getPageHeadText(nextPage) : "";
    const currentPhrases = getPhraseCandidates(currentText, "end");
    const nextPhrases = getPhraseCandidates(nextText, "start");

    return currentPhrases.length > 0 && nextPhrases.length > 0
      ? [{ currentPhrases, nextPhrases }]
      : [];
  });
}

function findPhraseRange(
  documentText: string,
  documentPositions: number[],
  entries: TextNodeEntry[],
  phrase: string,
  fromIndex: number,
) {
  const matchIndex = documentText.indexOf(phrase, fromIndex);

  if (matchIndex === -1) {
    return null;
  }

  const start = documentPositions[matchIndex];
  const endPosition = documentPositions[matchIndex + phrase.length - 1];

  if (start === undefined || endPosition === undefined) {
    return null;
  }

  const end = endPosition + 1;
  const getPoint = (
    offset: number,
    preferCurrentEnd: boolean,
    skipWhitespace = false,
  ) => {
    const entryIndex = entries.findIndex(
      (candidate) =>
        offset < candidate.end ||
        (preferCurrentEnd && offset === candidate.end),
    );
    const entry = entries[entryIndex];

    if (entry) {
      if (skipWhitespace && /^\s*$/.test(entry.node.nodeValue ?? "")) {
        const nextTextEntry = entries
          .slice(entryIndex + 1)
          .find((candidate) => !/^\s*$/.test(candidate.node.nodeValue ?? ""));

        if (nextTextEntry) {
          return { node: nextTextEntry.node, offset: 0 };
        }
      }

      return {
        node: entry.node,
        offset: offset - entry.start,
      };
    }

    const lastEntry = entries.at(-1);

    return lastEntry
      ? { node: lastEntry.node, offset: lastEntry.node.length }
      : null;
  };
  const startPoint = getPoint(start, true, true);
  const endPoint = getPoint(end, true);

  if (!startPoint || !endPoint) {
    return null;
  }

  const range = documentText
    ? entries[0]?.node.ownerDocument.createRange()
    : null;

  if (!range) {
    return null;
  }

  range.setStart(startPoint.node, startPoint.offset);
  range.setEnd(endPoint.node, endPoint.offset);

  return { end: matchIndex + phrase.length, range };
}

function findPhraseFromDocumentPosition(
  documentText: string,
  documentPositions: number[],
  entries: TextNodeEntry[],
  phrase: string,
  fromIndex: number,
) {
  return (
    findPhraseRange(
      documentText,
      documentPositions,
      entries,
      phrase,
      fromIndex,
    ) ??
    (fromIndex > 0
      ? findPhraseRange(
          documentText,
          documentPositions,
          entries,
          phrase,
          Math.max(0, fromIndex - phrase.length),
        )
      : null)
  );
}

function getRangeTop(range: Range) {
  const clientRects = Array.from(range.getClientRects());
  const firstRect = clientRects[0];

  return firstRect?.top ?? range.getBoundingClientRect().top;
}

export function getDocumentPageBreakPositions(
  documentCanvas: HTMLElement,
  anchors: PageBreakAnchor[],
) {
  const documentContent = documentCanvas.querySelector<HTMLElement>(
    ".document-editor-content",
  );

  if (
    !documentContent ||
    anchors.length === 0 ||
    documentCanvas.getClientRects().length === 0
  ) {
    return [];
  }

  const normalizedDocument = getNormalizedDocumentText(documentContent);
  const documentCanvasRect = documentCanvas.getBoundingClientRect();
  const documentScrollTop =
    documentCanvas.scrollHeight > documentCanvas.clientHeight + 1
      ? documentCanvas.scrollTop
      : window.scrollY;
  let fromIndex = 0;
  const positions: number[] = [];

  anchors.forEach((anchor) => {
    let currentMatch: ReturnType<typeof findPhraseRange> = null;

    for (const phrase of anchor.currentPhrases) {
      const match = findPhraseFromDocumentPosition(
        normalizedDocument.text,
        normalizedDocument.positions,
        normalizedDocument.entries,
        phrase,
        fromIndex,
      );

      if (!match) {
        continue;
      }

      currentMatch = match;
      break;
    }

    if (!currentMatch) {
      return;
    }

    for (const phrase of anchor.nextPhrases) {
      const nextMatch = findPhraseRange(
        normalizedDocument.text,
        normalizedDocument.positions,
        normalizedDocument.entries,
        phrase,
        currentMatch.end,
      );

      if (!nextMatch) {
        continue;
      }

      const rangeEdge = getRangeTop(nextMatch.range);
      const position =
        rangeEdge -
        documentCanvasRect.top +
        documentScrollTop +
        -8;

      if (Number.isFinite(position) && position > 0) {
        positions.push(position);
      }

      fromIndex = nextMatch.end;
      break;
    }
  });

  return positions;
}

export function getPageBreakPositions(
  documentCanvas: HTMLElement,
  previewCanvas: HTMLElement,
) {
  return getDocumentPageBreakPositions(
    documentCanvas,
    getPageBreakAnchors(previewCanvas),
  );
}

function arePositionsEqual(left: number[], right: number[]) {
  return (
    left.length === right.length &&
    left.every(
      (position, index) => Math.abs(position - (right[index] ?? 0)) < 1,
    )
  );
}

function isPageBreakOverlayNode(node: Node) {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return node.parentElement?.closest(".document-page-break-overlay") !== null;
  }

  const element = node as Element;

  return (
    element.matches(".document-page-break-overlay, .document-page-break-marker") ||
    element.closest(".document-page-break-overlay") !== null
  );
}

function isPageBreakOverlayMutation(record: MutationRecord) {
  const target = record.target instanceof Element
    ? record.target
    : record.target.parentElement;
  const changedNodes = [
    ...Array.from(record.addedNodes),
    ...Array.from(record.removedNodes),
  ];

  return (
    target?.closest(".document-page-break-overlay") !== null ||
    (changedNodes.length > 0 && changedNodes.every(isPageBreakOverlayNode))
  );
}

export function attachDocumentPageBreakMarkers(
  documentCanvas: HTMLElement | null,
  previewCanvas: HTMLElement | null,
  onChange: PageBreakMarkerListener,
) {
  if (!documentCanvas || !previewCanvas) {
    onChange([]);
    return () => undefined;
  }

  let frame: number | null = null;
  let previousPositions: number[] = [];

  const update = () => {
    frame = null;
    const anchors = getPageBreakAnchors(previewCanvas);
    const nextPositions = getDocumentPageBreakPositions(
      documentCanvas,
      anchors,
    );
    const previewPageCount = previewCanvas.querySelectorAll(
      "[data-document-page]",
    ).length;

    if (
      nextPositions.length === 0 &&
      previousPositions.length > 0 &&
      (previewPageCount === 0 || previewPageCount > 1)
    ) {
      return;
    }

    if (arePositionsEqual(previousPositions, nextPositions)) {
      return;
    }

    previousPositions = nextPositions;
    onChange(nextPositions);
  };

  const scheduleUpdate = () => {
    if (frame !== null) {
      window.cancelAnimationFrame(frame);
    }

    frame = window.requestAnimationFrame(update);
  };

  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(scheduleUpdate);
  resizeObserver?.observe(documentCanvas);
  resizeObserver?.observe(previewCanvas);
  resizeObserver?.observe(
    documentCanvas.querySelector<HTMLElement>(".document-editor-content") ??
      documentCanvas,
  );
  previewCanvas
    .querySelectorAll<HTMLElement>("[data-document-page]")
    .forEach((page) => resizeObserver?.observe(page));

  const mutationObserver =
    typeof MutationObserver === "undefined"
      ? null
      : new MutationObserver((records) => {
          if (records.some((record) => !isPageBreakOverlayMutation(record))) {
            scheduleUpdate();
          }
        });
  mutationObserver?.observe(documentCanvas, {
    characterData: true,
    childList: true,
    subtree: true,
  });
  mutationObserver?.observe(previewCanvas, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("resize", scheduleUpdate);
  scheduleUpdate();

  return () => {
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    window.removeEventListener("resize", scheduleUpdate);

    if (frame !== null) {
      window.cancelAnimationFrame(frame);
    }
  };
}
