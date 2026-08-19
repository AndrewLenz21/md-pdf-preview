import { create } from "zustand";

import type { MockDocument } from "@/modules/dashboard/document/model/document.types";
import { UNTITLED_DOCUMENT_TITLE } from "./document.store";

type CloudDocumentStoreState = {
  documents: MockDocument[];
  createDocument: () => string;
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
  documents: [],
  createDocument: () => {
    const id = createDocumentId();
    const document: MockDocument = {
      id,
      title: UNTITLED_DOCUMENT_TITLE,
      group: "documents",
      updatedAt: "Edited just now",
      content: `# ${UNTITLED_DOCUMENT_TITLE}\n\n`,
    };

    set((state) => ({
      documents: [...state.documents, document],
    }));

    return id;
  },
  setDocuments: (documents) => set({ documents }),
}));
