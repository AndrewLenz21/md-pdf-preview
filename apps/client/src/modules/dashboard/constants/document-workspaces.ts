import { MOCK_DOCUMENTS } from "./mock-documents";
import type {
  DocumentFolder,
  DocumentOrganization,
  MockDocument,
  WorkspaceItem,
} from "../document/model/document.types";

export type LegacyWorkspaceData = {
  documents: MockDocument[];
  folders: DocumentFolder[];
  organization: Record<string, DocumentOrganization>;
};

const LOCAL_ROOT_FOLDER_ID = "local-folder-root";
const LOCAL_RECENT_FOLDER_ID = "local-folder-recent";
const LOCAL_DOCUMENTS_FOLDER_ID = "local-folder-documents";
const LOCAL_WORKING_SET_FOLDER_ID = "local-folder-working-set";
const LOCAL_RESEARCH_NOTES_FOLDER_ID = "local-folder-research-notes";
const LOCAL_PLANNING_FOLDER_ID = "local-folder-planning";
const LOCAL_NOTES_FOLDER_ID = "local-folder-notes";

const LOCAL_ROOT_ROUTE = `/${LOCAL_ROOT_FOLDER_ID}`;
const LOCAL_RECENT_ROUTE = `${LOCAL_ROOT_ROUTE}/${LOCAL_RECENT_FOLDER_ID}`;
const LOCAL_DOCUMENTS_ROUTE = `${LOCAL_ROOT_ROUTE}/${LOCAL_DOCUMENTS_FOLDER_ID}`;
const LOCAL_WORKING_SET_ROUTE = `${LOCAL_RECENT_ROUTE}/${LOCAL_WORKING_SET_FOLDER_ID}`;
const LOCAL_RESEARCH_NOTES_ROUTE = `${LOCAL_RECENT_ROUTE}/${LOCAL_RESEARCH_NOTES_FOLDER_ID}`;
const LOCAL_PLANNING_ROUTE = `${LOCAL_DOCUMENTS_ROUTE}/${LOCAL_PLANNING_FOLDER_ID}`;
const LOCAL_NOTES_ROUTE = `${LOCAL_DOCUMENTS_ROUTE}/${LOCAL_NOTES_FOLDER_ID}`;

// Legacy nested snapshot kept for migration and rollback reference.
export const LOCAL_WORKSPACE_LEGACY_DATA: LegacyWorkspaceData = {
  documents: MOCK_DOCUMENTS,
  folders: [
    {
      id: LOCAL_ROOT_FOLDER_ID,
      name: "Workspace",
      parentId: null,
      route: LOCAL_ROOT_ROUTE,
      color: "primary",
      icon: "folder",
    },
    {
      id: LOCAL_RECENT_FOLDER_ID,
      name: "Recents",
      parentId: LOCAL_ROOT_FOLDER_ID,
      route: LOCAL_RECENT_ROUTE,
      color: "blue",
      icon: "briefcase",
    },
    {
      id: LOCAL_DOCUMENTS_FOLDER_ID,
      name: "Documents",
      parentId: LOCAL_ROOT_FOLDER_ID,
      route: LOCAL_DOCUMENTS_ROUTE,
      color: "violet",
      icon: "archive",
    },
    {
      id: LOCAL_WORKING_SET_FOLDER_ID,
      name: "Working set",
      parentId: LOCAL_RECENT_FOLDER_ID,
      route: LOCAL_WORKING_SET_ROUTE,
      color: "blue",
      icon: "target",
    },
    {
      id: LOCAL_RESEARCH_NOTES_FOLDER_ID,
      name: "Research notes",
      parentId: LOCAL_RECENT_FOLDER_ID,
      route: LOCAL_RESEARCH_NOTES_ROUTE,
      color: "emerald",
      icon: "lightbulb",
    },
    {
      id: LOCAL_PLANNING_FOLDER_ID,
      name: "Planning",
      parentId: LOCAL_DOCUMENTS_FOLDER_ID,
      route: LOCAL_PLANNING_ROUTE,
      color: "amber",
      icon: "code",
    },
    {
      id: LOCAL_NOTES_FOLDER_ID,
      name: "Notes",
      parentId: LOCAL_DOCUMENTS_FOLDER_ID,
      route: LOCAL_NOTES_ROUTE,
      color: "rose",
      icon: "book",
    },
  ],
  organization: {
    "project-research": {
      parentId: LOCAL_WORKING_SET_FOLDER_ID,
      route: `${LOCAL_WORKING_SET_ROUTE}/project-research`,
    },
    "product-proposal": {
      parentId: LOCAL_WORKING_SET_FOLDER_ID,
      route: `${LOCAL_WORKING_SET_ROUTE}/product-proposal`,
    },
    "cash-basis-tax-view": {
      parentId: LOCAL_WORKING_SET_FOLDER_ID,
      route: `${LOCAL_WORKING_SET_ROUTE}/cash-basis-tax-view`,
    },
    "research-notes": {
      parentId: LOCAL_RESEARCH_NOTES_FOLDER_ID,
      route: `${LOCAL_RESEARCH_NOTES_ROUTE}/research-notes`,
    },
    "meeting-notes": {
      parentId: LOCAL_NOTES_FOLDER_ID,
      route: `${LOCAL_NOTES_ROUTE}/meeting-notes`,
    },
    architecture: {
      parentId: LOCAL_PLANNING_FOLDER_ID,
      route: `${LOCAL_PLANNING_ROUTE}/architecture`,
    },
    roadmap: {
      parentId: LOCAL_PLANNING_FOLDER_ID,
      route: `${LOCAL_PLANNING_ROUTE}/roadmap`,
    },
    ideas: {
      parentId: LOCAL_NOTES_FOLDER_ID,
      route: `${LOCAL_NOTES_ROUTE}/ideas`,
    },
  },
};

const LOCAL_WORKSPACE_CREATED_AT = "2026-08-22T00:00:00.000Z";

const LOCAL_WORKSPACE_DOCUMENT_PARENT_IDS: Record<string, string> = {
  "project-research": LOCAL_WORKING_SET_FOLDER_ID,
  "product-proposal": LOCAL_WORKING_SET_FOLDER_ID,
  "cash-basis-tax-view": LOCAL_WORKING_SET_FOLDER_ID,
  "research-notes": LOCAL_RESEARCH_NOTES_FOLDER_ID,
  "meeting-notes": LOCAL_NOTES_FOLDER_ID,
  architecture: LOCAL_PLANNING_FOLDER_ID,
  roadmap: LOCAL_PLANNING_FOLDER_ID,
  ideas: LOCAL_NOTES_FOLDER_ID,
};

const LOCAL_WORKSPACE_FOLDER_ITEMS: WorkspaceItem[] = [
  {
    id: LOCAL_ROOT_FOLDER_ID,
    type: "folder",
    parent_id: null,
    name: "Workspace",
    created_at: LOCAL_WORKSPACE_CREATED_AT,
    updated_at: LOCAL_WORKSPACE_CREATED_AT,
    color: "primary",
    icon: "folder",
  },
  {
    id: LOCAL_RECENT_FOLDER_ID,
    type: "folder",
    parent_id: LOCAL_ROOT_FOLDER_ID,
    name: "Recents",
    created_at: LOCAL_WORKSPACE_CREATED_AT,
    updated_at: LOCAL_WORKSPACE_CREATED_AT,
    color: "blue",
    icon: "briefcase",
  },
  {
    id: LOCAL_DOCUMENTS_FOLDER_ID,
    type: "folder",
    parent_id: LOCAL_ROOT_FOLDER_ID,
    name: "Documents",
    created_at: LOCAL_WORKSPACE_CREATED_AT,
    updated_at: LOCAL_WORKSPACE_CREATED_AT,
    color: "violet",
    icon: "archive",
  },
  {
    id: LOCAL_WORKING_SET_FOLDER_ID,
    type: "folder",
    parent_id: LOCAL_RECENT_FOLDER_ID,
    name: "Working set",
    created_at: LOCAL_WORKSPACE_CREATED_AT,
    updated_at: LOCAL_WORKSPACE_CREATED_AT,
    color: "blue",
    icon: "target",
  },
  {
    id: LOCAL_RESEARCH_NOTES_FOLDER_ID,
    type: "folder",
    parent_id: LOCAL_RECENT_FOLDER_ID,
    name: "Research notes",
    created_at: LOCAL_WORKSPACE_CREATED_AT,
    updated_at: LOCAL_WORKSPACE_CREATED_AT,
    color: "emerald",
    icon: "lightbulb",
  },
  {
    id: LOCAL_PLANNING_FOLDER_ID,
    type: "folder",
    parent_id: LOCAL_DOCUMENTS_FOLDER_ID,
    name: "Planning",
    created_at: LOCAL_WORKSPACE_CREATED_AT,
    updated_at: LOCAL_WORKSPACE_CREATED_AT,
    color: "amber",
    icon: "code",
  },
  {
    id: LOCAL_NOTES_FOLDER_ID,
    type: "folder",
    parent_id: LOCAL_DOCUMENTS_FOLDER_ID,
    name: "Notes",
    created_at: LOCAL_WORKSPACE_CREATED_AT,
    updated_at: LOCAL_WORKSPACE_CREATED_AT,
    color: "rose",
    icon: "book",
  },
];

const LOCAL_WORKSPACE_DOCUMENT_ITEMS: WorkspaceItem[] = MOCK_DOCUMENTS.map(
  (document) => {
    return {
      id: document.id,
      type: "document",
      parent_id: LOCAL_WORKSPACE_DOCUMENT_PARENT_IDS[document.id] ?? null,
      name: document.title,
      created_at: LOCAL_WORKSPACE_CREATED_AT,
      updated_at: LOCAL_WORKSPACE_CREATED_AT,
      content: document.content ?? "",
      group: document.group,
    };
  },
);

// Historical local data kept as a development and test fixture. It is not seeded at runtime.
export const LOCAL_WORKSPACE_ITEMS_OLD: WorkspaceItem[] = [
  ...LOCAL_WORKSPACE_FOLDER_ITEMS,
  ...LOCAL_WORKSPACE_DOCUMENT_ITEMS,
];

// New guest sessions intentionally start without sample folders or documents.
export const LOCAL_WORKSPACE_ITEMS: WorkspaceItem[] = [];

export const CLOUD_WORKSPACE_ITEMS: WorkspaceItem[] = [
  {
    id: "cloud-folder-root",
    type: "folder",
    parent_id: null,
    name: "Cloud",
    created_at: LOCAL_WORKSPACE_CREATED_AT,
    updated_at: LOCAL_WORKSPACE_CREATED_AT,
    color: "primary",
    icon: "folder",
  },
];
