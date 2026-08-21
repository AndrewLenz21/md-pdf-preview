import { MOCK_DOCUMENTS } from "./mock-documents";
import type {
  DocumentFolder,
  DocumentOrganization,
  MockDocument,
} from "../document/model/document.types";

export type DocumentWorkspaceData = {
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

export const LOCAL_WORKSPACE_DATA: DocumentWorkspaceData = {
  documents: MOCK_DOCUMENTS,
  folders: [
    {
      id: LOCAL_ROOT_FOLDER_ID,
      name: "Workspace",
      parentId: null,
      route: LOCAL_ROOT_ROUTE,
      color: "primary",
    },
    {
      id: LOCAL_RECENT_FOLDER_ID,
      name: "Recents",
      parentId: LOCAL_ROOT_FOLDER_ID,
      route: LOCAL_RECENT_ROUTE,
      color: "blue",
    },
    {
      id: LOCAL_DOCUMENTS_FOLDER_ID,
      name: "Documents",
      parentId: LOCAL_ROOT_FOLDER_ID,
      route: LOCAL_DOCUMENTS_ROUTE,
      color: "violet",
    },
    {
      id: LOCAL_WORKING_SET_FOLDER_ID,
      name: "Working set",
      parentId: LOCAL_RECENT_FOLDER_ID,
      route: LOCAL_WORKING_SET_ROUTE,
      color: "blue",
    },
    {
      id: LOCAL_RESEARCH_NOTES_FOLDER_ID,
      name: "Research notes",
      parentId: LOCAL_RECENT_FOLDER_ID,
      route: LOCAL_RESEARCH_NOTES_ROUTE,
      color: "emerald",
    },
    {
      id: LOCAL_PLANNING_FOLDER_ID,
      name: "Planning",
      parentId: LOCAL_DOCUMENTS_FOLDER_ID,
      route: LOCAL_PLANNING_ROUTE,
      color: "amber",
    },
    {
      id: LOCAL_NOTES_FOLDER_ID,
      name: "Notes",
      parentId: LOCAL_DOCUMENTS_FOLDER_ID,
      route: LOCAL_NOTES_ROUTE,
      color: "rose",
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

export const CLOUD_WORKSPACE_DATA: DocumentWorkspaceData = {
  documents: [],
  folders: [],
  organization: {},
};
