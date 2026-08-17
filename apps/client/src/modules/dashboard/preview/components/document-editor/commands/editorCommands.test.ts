import { describe, expect, it } from "vitest";

import { editorCommands, findEditorCommands } from "./editorCommands";

describe("Document editor command registry", () => {
  it("filters commands by title and keywords", () => {
    expect(findEditorCommands("he").map((command) => command.id)).toEqual([
      "heading-1",
      "heading-2",
      "heading-3",
    ]);
    expect(findEditorCommands("code").map((command) => command.id)).toEqual([
      "code",
    ]);
  });

  it("keeps the core command set centralized", () => {
    expect(editorCommands.map((command) => command.id)).toEqual([
      "text",
      "heading-1",
      "heading-2",
      "heading-3",
      "bullet-list",
      "ordered-list",
      "task-list",
      "quote",
      "callout",
      "code",
      "divider",
    ]);
  });
});
