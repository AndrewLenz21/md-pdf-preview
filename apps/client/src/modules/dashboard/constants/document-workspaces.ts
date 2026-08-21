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

const LOCAL_ROOT_PATH = `/${LOCAL_ROOT_FOLDER_ID}`;
const LOCAL_RECENT_PATH = `${LOCAL_ROOT_PATH}/${LOCAL_RECENT_FOLDER_ID}`;
const LOCAL_DOCUMENTS_PATH = `${LOCAL_ROOT_PATH}/${LOCAL_DOCUMENTS_FOLDER_ID}`;
const LOCAL_WORKING_SET_PATH = `${LOCAL_RECENT_PATH}/${LOCAL_WORKING_SET_FOLDER_ID}`;
const LOCAL_RESEARCH_NOTES_PATH = `${LOCAL_RECENT_PATH}/${LOCAL_RESEARCH_NOTES_FOLDER_ID}`;
const LOCAL_PLANNING_PATH = `${LOCAL_DOCUMENTS_PATH}/${LOCAL_PLANNING_FOLDER_ID}`;
const LOCAL_NOTES_PATH = `${LOCAL_DOCUMENTS_PATH}/${LOCAL_NOTES_FOLDER_ID}`;

export const LOCAL_WORKSPACE_DATA: DocumentWorkspaceData = {
  documents: MOCK_DOCUMENTS,
  folders: [
    {
      id: LOCAL_ROOT_FOLDER_ID,
      name: "Workspace",
      parentId: null,
      path: LOCAL_ROOT_PATH,
      color: "primary",
    },
    {
      id: LOCAL_RECENT_FOLDER_ID,
      name: "Recents",
      parentId: LOCAL_ROOT_FOLDER_ID,
      path: LOCAL_RECENT_PATH,
      color: "blue",
    },
    {
      id: LOCAL_DOCUMENTS_FOLDER_ID,
      name: "Documents",
      parentId: LOCAL_ROOT_FOLDER_ID,
      path: LOCAL_DOCUMENTS_PATH,
      color: "violet",
    },
    {
      id: LOCAL_WORKING_SET_FOLDER_ID,
      name: "Working set",
      parentId: LOCAL_RECENT_FOLDER_ID,
      path: LOCAL_WORKING_SET_PATH,
      color: "blue",
    },
    {
      id: LOCAL_RESEARCH_NOTES_FOLDER_ID,
      name: "Research notes",
      parentId: LOCAL_RECENT_FOLDER_ID,
      path: LOCAL_RESEARCH_NOTES_PATH,
      color: "emerald",
    },
    {
      id: LOCAL_PLANNING_FOLDER_ID,
      name: "Planning",
      parentId: LOCAL_DOCUMENTS_FOLDER_ID,
      path: LOCAL_PLANNING_PATH,
      color: "amber",
    },
    {
      id: LOCAL_NOTES_FOLDER_ID,
      name: "Notes",
      parentId: LOCAL_DOCUMENTS_FOLDER_ID,
      path: LOCAL_NOTES_PATH,
      color: "rose",
    },
  ],
  organization: {
    "project-research": {
      folderId: LOCAL_WORKING_SET_FOLDER_ID,
      path: `${LOCAL_WORKING_SET_PATH}/project-research`,
    },
    "product-proposal": {
      folderId: LOCAL_WORKING_SET_FOLDER_ID,
      path: `${LOCAL_WORKING_SET_PATH}/product-proposal`,
    },
    "cash-basis-tax-view": {
      folderId: LOCAL_WORKING_SET_FOLDER_ID,
      path: `${LOCAL_WORKING_SET_PATH}/cash-basis-tax-view`,
    },
    "research-notes": {
      folderId: LOCAL_RESEARCH_NOTES_FOLDER_ID,
      path: `${LOCAL_RESEARCH_NOTES_PATH}/research-notes`,
    },
    "meeting-notes": {
      folderId: LOCAL_NOTES_FOLDER_ID,
      path: `${LOCAL_NOTES_PATH}/meeting-notes`,
    },
    architecture: {
      folderId: LOCAL_PLANNING_FOLDER_ID,
      path: `${LOCAL_PLANNING_PATH}/architecture`,
    },
    roadmap: {
      folderId: LOCAL_PLANNING_FOLDER_ID,
      path: `${LOCAL_PLANNING_PATH}/roadmap`,
    },
    ideas: {
      folderId: LOCAL_NOTES_FOLDER_ID,
      path: `${LOCAL_NOTES_PATH}/ideas`,
    },
  },
};

export const CLOUD_WORKSPACE_DATA: DocumentWorkspaceData = {
  documents: [],
  folders: [],
  organization: {},
};
