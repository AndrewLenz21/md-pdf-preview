import { create } from "zustand";

import { LOCAL_WORKSPACE_ITEMS } from "@/modules/dashboard/constants/document-workspaces";

import {
  SESSION_MARKDOWN_CHARACTER_LIMIT,
  createWorkspaceItemsState,
  normalizeWorkspaceItems,
  type WorkspaceItemsStoreState,
} from "./workspace-items.store";
import {
  loadLocalWorkspaceItems,
  queueLocalWorkspaceChanges,
} from "./local-workspace.repository";

type LocalWorkspaceStoreState = WorkspaceItemsStoreState & {
  isHydrated: boolean;
  isHydrating: boolean;
  hydrate: () => Promise<void>;
};

export const useLocalWorkspaceStore = create<LocalWorkspaceStoreState>(
  (set, get, api) => ({
    ...createWorkspaceItemsState<LocalWorkspaceStoreState>({
      initialItems: [],
      maxMarkdownCharacters: SESSION_MARKDOWN_CHARACTER_LIMIT,
      onItemsChanged: queueLocalWorkspaceChanges,
    })(set, get, api),
    isHydrated: false,
    isHydrating: false,
    hydrate: async () => {
      if (get().isHydrated || get().isHydrating) {
        return;
      }

      set({ isHydrating: true });

      try {
        const items = await loadLocalWorkspaceItems(LOCAL_WORKSPACE_ITEMS);
        set({ items: normalizeWorkspaceItems(items), isHydrated: true });
      } catch {
        set({
          items: normalizeWorkspaceItems(LOCAL_WORKSPACE_ITEMS),
          isHydrated: true,
        });
      } finally {
        set({ isHydrating: false });
      }
    },
  }),
);

export type { LocalWorkspaceStoreState };
