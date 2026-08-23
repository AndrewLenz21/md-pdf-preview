import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("AppServer", () => {
  const originalBackendURL = process.env.BACKEND_URL;
  const originalInternalAPIKey = process.env.INTERNAL_API_KEY;

  beforeEach(() => {
    process.env.BACKEND_URL = "http://localhost:8080";
    process.env.INTERNAL_API_KEY = "internal-test-key";
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.BACKEND_URL = originalBackendURL;
    process.env.INTERNAL_API_KEY = originalInternalAPIKey;
  });

  it("preserves the trusted user header on JSON requests", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { appServer } = await import("./server");

    await appServer.withUser("user-123").post("workspace/items", {
      parentId: null,
      name: "First document",
      type: "document",
    });

    const requestOptions = fetchMock.mock.calls[0]?.[1];
    const requestHeaders = new Headers(requestOptions?.headers);

    expect(requestHeaders.get("X-User-Id")).toBe("user-123");
    expect(requestHeaders.get("X-Api-Key")).toBe("internal-test-key");
    expect(requestHeaders.get("Content-Type")).toBe("application/json");
  });
});
