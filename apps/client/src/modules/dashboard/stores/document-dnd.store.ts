import { create } from "zustand";

type DocumentDndState = {
  isDragging: boolean;
  setDragging: (isDragging: boolean) => void;
};

export const useDocumentDndStore = create<DocumentDndState>((set) => ({
  isDragging: false,
  setDragging: (isDragging) => set({ isDragging }),
}));
