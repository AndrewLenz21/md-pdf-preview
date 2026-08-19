import { create } from "zustand";

import {
  MOCK_DOCUMENTS,
  SELECTED_DOCUMENT_ID,
} from "@/modules/dashboard/constants/mock-documents";
import type { MockDocument } from "@/modules/dashboard/document/model/document.types";

export const DOCUMENT_CONTENT_DEBOUNCE_MS = 500;
export const MAX_MARKDOWN_CHARACTERS = 20_000;
export const UNTITLED_DOCUMENT_TITLE = "Untitled";

type PendingContentUpdate = {
  content: string;
  timeoutId: ReturnType<typeof setTimeout>;
};

export type DocumentStoreState = {
  documents: MockDocument[];
  pendingContentByDocumentId: Record<string, string>;
  selectedDocumentId: string;
  selectDocument: (documentId: string) => void;
  scheduleContentUpdate: (documentId: string, content: string) => void;
  flushPendingContent: (documentId: string) => void;
  flushAllPendingContent: () => void;
};

const pendingContentUpdates = new Map<string, PendingContentUpdate>();

function cancelPendingContentUpdate(documentId: string) {
  const pendingUpdate = pendingContentUpdates.get(documentId);

  if (!pendingUpdate) {
    return;
  }

  clearTimeout(pendingUpdate.timeoutId);
  pendingContentUpdates.delete(documentId);
}

function limitMarkdownContent(content: string) {
  return content.slice(0, MAX_MARKDOWN_CHARACTERS);
}

function getFirstNonEmptyLine(markdown: string) {
  let offset = 0;

  while (offset <= markdown.length) {
    const lineEnd = markdown.indexOf("\n", offset);
    const end = lineEnd === -1 ? markdown.length : lineEnd;
    const line = markdown.slice(offset, end).replace(/\r$/, "");

    if (line.trim().length > 0) {
      return { line, offset };
    }

    if (lineEnd === -1) {
      break;
    }

    offset = lineEnd + 1;
  }

  return null;
}

function getFirstHeadingTitle(markdown: string) {
  const firstLine = getFirstNonEmptyLine(markdown);
  const match = firstLine?.line.match(
    /^[ \t]{0,3}#(?:[ \t]+(.*?))?[ \t]*$/,
  );

  if (!match) {
    return null;
  }

  const title = (match[1] ?? "")
    .replace(/[ \t]+#+[ \t]*$/, "")
    .trim();

  return title;
}

export function normalizeMarkdownDocument(markdown: string) {
  const firstLine = getFirstNonEmptyLine(markdown);
  const title = getFirstHeadingTitle(markdown);

  if (firstLine && title !== null) {
    return {
      content: limitMarkdownContent(
        firstLine.offset > 0 ? markdown.slice(firstLine.offset) : markdown,
      ),
      title: title || UNTITLED_DOCUMENT_TITLE,
    };
  }

  const body = firstLine ? markdown.slice(firstLine.offset) : "";

  return {
    content: limitMarkdownContent(
      `# ${UNTITLED_DOCUMENT_TITLE}\n\n${body}`,
    ),
    title: UNTITLED_DOCUMENT_TITLE,
  };
}

function normalizeDocument(document: MockDocument) {
  const normalized = normalizeMarkdownDocument(document.content ?? "");

  return {
    ...document,
    content: normalized.content,
    title: normalized.title,
  };
}

function commitContent(
  set: (updater: (state: DocumentStoreState) => Partial<DocumentStoreState>) => void,
  documentId: string,
  content: string,
) {
  set((state) => {
    const document = state.documents.find((item) => item.id === documentId);
    const title =
      getFirstHeadingTitle(content) || UNTITLED_DOCUMENT_TITLE;

    if (!document || (document.content === content && document.title === title)) {
      return {
        pendingContentByDocumentId: omitPendingContent(
          state.pendingContentByDocumentId,
          documentId,
        ),
      };
    }

    return {
      documents: state.documents.map((item) =>
        item.id === documentId ? { ...item, content, title } : item,
      ),
      pendingContentByDocumentId: omitPendingContent(
        state.pendingContentByDocumentId,
        documentId,
      ),
    };
  });
}

function omitPendingContent(
  pendingContentByDocumentId: Record<string, string>,
  documentId: string,
) {
  const nextPendingContent = { ...pendingContentByDocumentId };
  delete nextPendingContent[documentId];
  return nextPendingContent;
}

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  documents: MOCK_DOCUMENTS.map(normalizeDocument),
  pendingContentByDocumentId: {},
  selectedDocumentId: SELECTED_DOCUMENT_ID,

  selectDocument: (documentId) => {
    const currentDocumentId = get().selectedDocumentId;

    if (
      currentDocumentId === documentId ||
      !get().documents.some((document) => document.id === documentId)
    ) {
      return;
    }

    get().flushPendingContent(currentDocumentId);
    set({ selectedDocumentId: documentId });
  },

  scheduleContentUpdate: (documentId, content) => {
    const document = get().documents.find((item) => item.id === documentId);
    const normalized = normalizeMarkdownDocument(content);
    const limitedContent = normalized.content;

    if (!document) {
      return;
    }

    if (document.content === limitedContent) {
      cancelPendingContentUpdate(documentId);
      set((state) => ({
        pendingContentByDocumentId: omitPendingContent(
          state.pendingContentByDocumentId,
          documentId,
        ),
      }));
      return;
    }

    cancelPendingContentUpdate(documentId);
    set((state) => ({
      pendingContentByDocumentId: {
        ...state.pendingContentByDocumentId,
        [documentId]: limitedContent,
      },
    }));

    const timeoutId = setTimeout(() => {
      const pendingUpdate = pendingContentUpdates.get(documentId);

      if (!pendingUpdate || pendingUpdate.timeoutId !== timeoutId) {
        return;
      }

      pendingContentUpdates.delete(documentId);
      commitContent(set, documentId, pendingUpdate.content);
    }, DOCUMENT_CONTENT_DEBOUNCE_MS);

    pendingContentUpdates.set(documentId, {
      content: limitedContent,
      timeoutId,
    });
  },

  flushPendingContent: (documentId) => {
    const pendingUpdate = pendingContentUpdates.get(documentId);

    if (!pendingUpdate) {
      return;
    }

    cancelPendingContentUpdate(documentId);
    commitContent(set, documentId, pendingUpdate.content);
  },

  flushAllPendingContent: () => {
    [...pendingContentUpdates.keys()].forEach((documentId) => {
      get().flushPendingContent(documentId);
    });
  },
}));
