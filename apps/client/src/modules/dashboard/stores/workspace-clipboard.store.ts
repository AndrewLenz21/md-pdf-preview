import { create } from "zustand";

import type { DocumentSource } from "@/modules/dashboard/document/model/document.types";

export type WorkspaceClipboardItem = {
  id: string;
  source: DocumentSource;
  kind: "document" | "folder";
};

type WorkspaceClipboardStoreState = {
  item: WorkspaceClipboardItem | null;
  setItem: (item: WorkspaceClipboardItem) => void;
  clear: () => void;
};

export const useWorkspaceClipboardStore =
  create<WorkspaceClipboardStoreState>((set) => ({
    item: null,
    setItem: (item) => set({ item }),
    clear: () => set({ item: null }),
  }));
