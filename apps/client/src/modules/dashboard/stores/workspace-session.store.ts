import { create } from "zustand";

import type { DocumentSource } from "@/modules/dashboard/document/model/document.types";

export type WorkspaceTransferState = {
  source: DocumentSource;
  destination: DocumentSource;
};

type WorkspaceSessionStoreState = {
  activeSource: DocumentSource;
  selectedDocumentId: string | null;
  selectedDocumentSource: DocumentSource | null;
  workspaceTransfer: WorkspaceTransferState | null;
  setActiveSource: (source: DocumentSource) => void;
  selectDocument: (documentId: string, source: DocumentSource) => void;
  clearSelection: () => void;
  setWorkspaceTransfer: (transfer: WorkspaceTransferState | null) => void;
};

export const useWorkspaceSessionStore = create<WorkspaceSessionStoreState>(
  (set) => ({
    activeSource: "local",
    selectedDocumentId: null,
    selectedDocumentSource: null,
    workspaceTransfer: null,
    setActiveSource: (activeSource) => set({ activeSource }),
    selectDocument: (selectedDocumentId, selectedDocumentSource) =>
      set({ selectedDocumentId, selectedDocumentSource }),
    clearSelection: () =>
      set({ selectedDocumentId: null, selectedDocumentSource: null }),
    setWorkspaceTransfer: (workspaceTransfer) => set({ workspaceTransfer }),
  }),
);

export type { WorkspaceSessionStoreState };
