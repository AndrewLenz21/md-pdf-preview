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
