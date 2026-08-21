import { create } from "zustand";

import { CLOUD_WORKSPACE_DATA } from "@/modules/dashboard/constants/document-workspaces";
import type { MockDocument } from "@/modules/dashboard/document/model/document.types";
import {
  createInitialMarkdown,
  UNTITLED_DOCUMENT_TITLE,
} from "./document.store";

type CloudDocumentStoreState = {
  documents: MockDocument[];
  createDocument: (title?: string) => string;
  setDocuments: (documents: MockDocument[]) => void;
};

function createDocumentId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `cloud-document-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Cloud documents will be populated when the synchronization layer is ready.
export const useCloudDocumentStore = create<CloudDocumentStoreState>((set) => ({
  documents: CLOUD_WORKSPACE_DATA.documents,
  createDocument: (title) => {
    const id = createDocumentId();
    const trimmedTitle = title?.trim();
    const document: MockDocument = {
      id,
      title: trimmedTitle || UNTITLED_DOCUMENT_TITLE,
      group: "documents",
      updatedAt: "Edited just now",
      content: createInitialMarkdown(trimmedTitle),
    };

    set((state) => ({
      documents: [...state.documents, document],
    }));

    return id;
  },
  setDocuments: (documents) => set({ documents }),
}));
