import { create } from "zustand";

import type { DocumentSource } from "@/modules/dashboard/document/model/document.types";

type WorkspaceSessionStoreState = {
  activeSource: DocumentSource;
  selectedDocumentId: string | null;
  setActiveSource: (source: DocumentSource) => void;
  selectDocument: (documentId: string) => void;
  clearSelection: () => void;
};

export const useWorkspaceSessionStore = create<WorkspaceSessionStoreState>(
  (set) => ({
    activeSource: "local",
    selectedDocumentId: null,
    setActiveSource: (activeSource) =>
      set({ activeSource, selectedDocumentId: null }),
    selectDocument: (selectedDocumentId) => set({ selectedDocumentId }),
    clearSelection: () => set({ selectedDocumentId: null }),
  }),
);

export type { WorkspaceSessionStoreState };
