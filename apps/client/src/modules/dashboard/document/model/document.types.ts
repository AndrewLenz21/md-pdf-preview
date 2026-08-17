export type DocumentGroup = "recent" | "documents";

export type MockDocument = {
  id: string;
  title: string;
  group: DocumentGroup;
  updatedAt: string;
  content?: string;
};
