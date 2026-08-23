import type { WorkspaceDocumentItem } from "@/modules/dashboard/document/model/document.types";
import { MAX_MARKDOWN_CHARACTERS } from "../stores/workspace-items.store";

export type WorkspaceApiItem = {
  id: string;
  parentId: string | null;
  type: "folder" | "document";
  name: string;
  color: string | null;
  icon: string | null;
  favorite: boolean;
  sortOrder: number;
  contentType?: string | null;
  sizeBytes?: number | null;
  contentRevision: number;
  storageStatus?: "pending" | "ready" | "failed" | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type WorkspaceApiItemInput = {
  parentId: string | null;
  name: string;
  type: "folder" | "document";
  color?: string;
  icon?: string;
};

export type WorkspaceApiItemUpdate = {
  name: string;
  parentId: string | null;
  color?: string;
  icon?: string;
  favorite: boolean;
  sortOrder: number;
};

export class WorkspaceApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly body: unknown;

  constructor(
    message: string,
    status: number,
    code = "WORKSPACE_API_ERROR",
    body?: unknown,
  ) {
    super(message);
    this.name = "WorkspaceApiError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

function getErrorDetails(body: unknown) {
  if (typeof body === "string") {
    return { code: "WORKSPACE_API_ERROR", message: body };
  }

  if (body && typeof body === "object") {
    const candidate = body as { code?: unknown; message?: unknown };
    return {
      code:
        typeof candidate.code === "string"
          ? candidate.code
          : "WORKSPACE_API_ERROR",
      message:
        typeof candidate.message === "string"
          ? candidate.message
          : "Workspace request failed.",
    };
  }

  return {
    code: "WORKSPACE_API_ERROR",
    message: "Workspace request failed.",
  };
}

async function readResponseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function request<T>(path: string, options: RequestInit = {}) {
  let response: Response;

  try {
    response = await fetch(`/api/workspace/${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    const apiError = new WorkspaceApiError(
      "Workspace service is unavailable.",
      0,
      "WORKSPACE_NETWORK_ERROR",
      error,
    );
    console.error(
      `[WorkspaceApi] ${options.method ?? "GET"} ${path} failed:`,
      error,
    );
    throw apiError;
  }

  const body = await readResponseBody(response);

  if (!response.ok) {
    const details = getErrorDetails(body);
    const error = new WorkspaceApiError(
      details.message,
      response.status,
      details.code,
      body,
    );
    console.error(
      `[WorkspaceApi] ${options.method ?? "GET"} ${path} returned ${response.status}:`,
      body,
    );
    throw error;
  }

  return body as T;
}

export const workspaceApi = {
  listItems: () => request<WorkspaceApiItem[]>("items"),
  createItem: (input: WorkspaceApiItemInput) =>
    request<WorkspaceApiItem>("items", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateItem: (itemId: string, input: WorkspaceApiItemUpdate) =>
    request<WorkspaceApiItem>(`items/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteItem: (itemId: string) =>
    request<{ deletedCount: number }>(
      `items/${encodeURIComponent(itemId)}`,
      { method: "DELETE" },
    ),
  getUploadUrl: (documentId: string, contentType: string) =>
    request<{ objectKey: string; url: string }>(
      `documents/${encodeURIComponent(documentId)}/upload-url`,
      {
        method: "POST",
        body: JSON.stringify({ contentType }),
      },
    ),
  getDownloadUrl: (documentId: string) =>
    request<{ objectKey: string; url: string }>(
      `documents/${encodeURIComponent(documentId)}/download-url`,
    ),
  completeUpload: (
    documentId: string,
    input: {
      objectKey: string;
      contentType: string;
      sizeBytes: number;
      contentHash: string;
      contentRevision: number;
    },
  ) =>
    request<WorkspaceApiItem>(
      `documents/${encodeURIComponent(documentId)}/upload-complete`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
};

async function fetchSignedResponse(url: string) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      const body = await readResponseBody(response);
      const details = getErrorDetails(body);
      const error = new WorkspaceApiError(
        details.message,
        response.status,
        details.code,
        body,
      );
      console.error(
        `[WorkspaceApi] signed URL returned ${response.status}:`,
        body,
      );
      throw error;
    }

    return response;
  } catch (error) {
    if (error instanceof WorkspaceApiError) {
      throw error;
    }

    const apiError = new WorkspaceApiError(
      "Workspace document storage is unavailable.",
      0,
      "WORKSPACE_STORAGE_NETWORK_ERROR",
      error,
    );
    console.error("[WorkspaceApi] signed URL request failed:", error);
    throw apiError;
  }
}

export async function downloadWorkspaceDocument(documentId: string) {
  const { url } = await workspaceApi.getDownloadUrl(documentId);
  return (await fetchSignedResponse(url)).text();
}

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function uploadWorkspaceDocument(
  document: WorkspaceDocumentItem,
  content: string,
) {
  if (content.length > MAX_MARKDOWN_CHARACTERS) {
    throw new WorkspaceApiError(
      `Cloud file "${document.name}" cannot be saved because it has ${content.length.toLocaleString()} characters. The maximum is ${MAX_MARKDOWN_CHARACTERS.toLocaleString()}.`,
      413,
      "WORKSPACE_CONTENT_TOO_LARGE",
    );
  }

  const contentType = "text/markdown; charset=utf-8";
  const body = new TextEncoder().encode(content);
  const contentHash = toHex(await crypto.subtle.digest("SHA-256", body));
  const { objectKey, url } = await workspaceApi.getUploadUrl(
    document.id,
    contentType,
  );

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body,
    });

    if (!response.ok) {
      const responseBody = await readResponseBody(response);
      const details = getErrorDetails(responseBody);
      const error = new WorkspaceApiError(
        details.message,
        response.status,
        details.code,
        responseBody,
      );
      console.error(
        `[WorkspaceApi] document upload returned ${response.status}:`,
        responseBody,
      );
      throw error;
    }
  } catch (error) {
    if (error instanceof WorkspaceApiError) {
      throw error;
    }

    const apiError = new WorkspaceApiError(
      "Workspace document upload failed.",
      0,
      "WORKSPACE_UPLOAD_NETWORK_ERROR",
      error,
    );
    console.error("[WorkspaceApi] document upload failed:", error);
    throw apiError;
  }

  return workspaceApi.completeUpload(document.id, {
    objectKey,
    contentType,
    sizeBytes: body.byteLength,
    contentHash,
    contentRevision: (document.content_revision ?? 0) + 1,
  });
}

export function isWorkspaceApiError(error: unknown): error is WorkspaceApiError {
  return error instanceof WorkspaceApiError;
}

export function toWorkspaceApiError(error: unknown) {
  return isWorkspaceApiError(error)
    ? error
    : new WorkspaceApiError(
        error instanceof Error ? error.message : "Workspace operation failed.",
        0,
        "WORKSPACE_OPERATION_ERROR",
        error,
      );
}
