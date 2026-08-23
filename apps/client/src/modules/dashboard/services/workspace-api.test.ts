import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkspaceApiError, workspaceApi } from "./workspace-api";

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
});
