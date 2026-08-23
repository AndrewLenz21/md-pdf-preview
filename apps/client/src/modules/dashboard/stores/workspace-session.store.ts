import { create } from "zustand";

import type { DocumentSource } from "@/modules/dashboard/document/model/document.types";

type WorkspaceSessionStoreState = {
  activeSource: DocumentSource;
  selectedDocumentId: string | null;
  selectedDocumentSource: DocumentSource | null;
  setActiveSource: (source: DocumentSource) => void;
  selectDocument: (documentId: string, source: DocumentSource) => void;
  clearSelection: () => void;
};

export const useWorkspaceSessionStore = create<WorkspaceSessionStoreState>(
  (set) => ({
    activeSource: "local",
    selectedDocumentId: null,
    selectedDocumentSource: null,
    setActiveSource: (activeSource) => set({ activeSource }),
    selectDocument: (selectedDocumentId, selectedDocumentSource) =>
      set({ selectedDocumentId, selectedDocumentSource }),
    clearSelection: () =>
      set({ selectedDocumentId: null, selectedDocumentSource: null }),
  }),
);

export type { WorkspaceSessionStoreState };
