export type DocumentGroup = "recent" | "documents";

export type DocumentSource = "local" | "cloud";

export type DocumentFolderColor =
  "primary" | "blue" | "violet" | "amber" | "rose" | "emerald";

export type DocumentFolderIcon =
  | "folder"
  | "briefcase"
  | "book"
  | "code"
  | "lightbulb"
  | "archive"
  | "star"
  | "target"
  | "calendar"
  | "image"
  | "music"
  | "heart"
  | "users"
  | "map"
  | "key"
  | "wrench";

export const DEFAULT_DOCUMENT_FOLDER_COLOR: DocumentFolderColor = "primary";
export const DEFAULT_DOCUMENT_FOLDER_ICON: DocumentFolderIcon = "folder";

export type DocumentFolder = {
  id: string;
  name: string;
  parentId: string | null;
  route: string;
  color: DocumentFolderColor;
  icon: DocumentFolderIcon;
};

export type DocumentOrganization = {
  parentId: string | null;
  route: string;
  displayTitle?: string;
  deleted?: boolean;
  favorite?: boolean;
};

export type MockDocument = {
  id: string;
  title: string;
  group: DocumentGroup;
  updatedAt: string;
  content?: string;
};

type WorkspaceItemBase = {
  id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
};

export type WorkspaceFolderItem = WorkspaceItemBase & {
  type: "folder";
  color: DocumentFolderColor;
  icon: DocumentFolderIcon;
};

export type WorkspaceDocumentItem = WorkspaceItemBase & {
  type: "document";
  group: DocumentGroup;
  content: string;
  favorite?: boolean;
  deleted_at?: string | null;
};

export type WorkspaceItem = WorkspaceFolderItem | WorkspaceDocumentItem;
