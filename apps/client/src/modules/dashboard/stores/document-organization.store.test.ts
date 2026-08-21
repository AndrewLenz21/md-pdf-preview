import { describe, expect, it } from "vitest";

import { useDocumentOrganizationStore } from "./document-organization.store";

describe("document organization store", () => {
  it("allows folders beyond the previous depth limit", () => {
    let parentId: string | null = null;

    for (let level = 1; level <= 21; level += 1) {
      parentId = useDocumentOrganizationStore
        .getState()
        .createFolder("cloud", `Level ${level}`, parentId);

      expect(parentId).not.toBeNull();
    }
  });
});
