import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorkspaceDocumentItem } from "@/modules/dashboard/document/model/document.types";
import { MAX_MARKDOWN_CHARACTERS } from "../stores/workspace-items.store";
import {
  WorkspaceApiError,
  uploadWorkspaceDocument,
  workspaceApi,
} from "./workspace-api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("workspace API", () => {
  it("uses the client workspace route for item requests", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    await expect(workspaceApi.listItems()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/workspace/items",
      expect.objectContaining({ headers: {} }),
    );
  });

  it("throws a typed error when the API returns non-JSON", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("upstream unavailable", { status: 502 }),
    );

    const request = workspaceApi.listItems();

    await expect(request).rejects.toBeInstanceOf(WorkspaceApiError);
    await expect(request).rejects.toMatchObject({
      status: 502,
      message: "upstream unavailable",
    });
    expect(console.error).toHaveBeenCalled();
  });

  it("does not log an expected unauthorized response", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ message: "authenticated user is required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(workspaceApi.listItems()).rejects.toMatchObject({
      status: 401,
    });
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe("uploadWorkspaceDocument", () => {
  it("rejects oversized content before requesting an upload URL", async () => {
    const getUploadUrl = vi.spyOn(workspaceApi, "getUploadUrl");
    const document = {
      id: "cloud-document",
      type: "document",
      parent_id: null,
      name: "Large cloud document",
      created_at: "2026-08-23T00:00:00.000Z",
      updated_at: "2026-08-23T00:00:00.000Z",
      content: "# Large cloud document",
      group: "documents",
    } satisfies WorkspaceDocumentItem;

    await expect(
      uploadWorkspaceDocument(
        document,
        "x".repeat(MAX_MARKDOWN_CHARACTERS + 1),
      ),
    ).rejects.toMatchObject({
      code: "WORKSPACE_CONTENT_TOO_LARGE",
      status: 413,
    });
    expect(getUploadUrl).not.toHaveBeenCalled();
  });
});
