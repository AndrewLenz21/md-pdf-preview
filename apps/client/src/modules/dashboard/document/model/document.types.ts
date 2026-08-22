export type DocumentGroup = "recent" | "documents";

export type DocumentSource = "local" | "cloud";

export type DocumentFolderColor =
  "primary" | "blue" | "violet" | "amber" | "rose" | "emerald";

export type DocumentFolder = {
  id: string;
  name: string;
  parentId: string | null;
  route: string;
  color: DocumentFolderColor;
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

export type LocalWorkspaceItem = {
  id: string;
  type: "folder" | "document";
  parent_id: string | null;
  route: string;
  name: string;
  created_at: string;
  updated_at?: string;
  content?: string;
  group?: DocumentGroup;
  color?: DocumentFolderColor;
};
