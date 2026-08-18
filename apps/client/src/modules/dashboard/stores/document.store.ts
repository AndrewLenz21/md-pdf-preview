import { create } from "zustand";

import {
  MOCK_DOCUMENTS,
  SELECTED_DOCUMENT_ID,
} from "@/modules/dashboard/constants/mock-documents";
import type { MockDocument } from "@/modules/dashboard/document/model/document.types";

export const DOCUMENT_CONTENT_DEBOUNCE_MS = 500;

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

function commitContent(
  set: (updater: (state: DocumentStoreState) => Partial<DocumentStoreState>) => void,
  documentId: string,
  content: string,
) {
  set((state) => {
    const document = state.documents.find((item) => item.id === documentId);

    if (!document || document.content === content) {
      return {
        pendingContentByDocumentId: omitPendingContent(
          state.pendingContentByDocumentId,
          documentId,
        ),
      };
    }

    return {
      documents: state.documents.map((item) =>
        item.id === documentId ? { ...item, content } : item,
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
  documents: MOCK_DOCUMENTS,
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

    if (!document) {
      return;
    }

    if (document.content === content) {
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
        [documentId]: content,
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

    pendingContentUpdates.set(documentId, { content, timeoutId });
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
