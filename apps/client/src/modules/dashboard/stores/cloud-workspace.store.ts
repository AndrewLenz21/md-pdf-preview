import { create } from "zustand";

import { CLOUD_WORKSPACE_ITEMS } from "@/modules/dashboard/constants/document-workspaces";

import {
  MAX_MARKDOWN_CHARACTERS,
  createWorkspaceItemsState,
  type WorkspaceItemsStoreState,
} from "./workspace-items.store";

export const useCloudWorkspaceStore = create<WorkspaceItemsStoreState>(
  createWorkspaceItemsState({
    initialItems: CLOUD_WORKSPACE_ITEMS,
    maxMarkdownCharacters: MAX_MARKDOWN_CHARACTERS,
  }),
);
