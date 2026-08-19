import { describe, expect, it } from "vitest";

import {
  MAX_FOLDER_DEPTH,
  useDocumentOrganizationStore,
} from "./document-organization.store";

describe("document organization store", () => {
  it("allows folders through level 20 but rejects level 21", () => {
    let parentId: string | null = null;

    for (let level = 1; level <= MAX_FOLDER_DEPTH; level += 1) {
      parentId = useDocumentOrganizationStore
        .getState()
        .createFolder("cloud", `Level ${level}`, parentId);

      expect(parentId).not.toBeNull();
    }

    expect(
      useDocumentOrganizationStore
        .getState()
        .createFolder("cloud", "Level 21", parentId),
    ).toBeNull();
  });
});
