// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { createEditingActions, isSaveShortcut } from "./editingActions";

describe("editing actions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints when the desktop split toolbar is backed by the document editor", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const actions = createEditingActions({
      modeRef: { current: "document" },
      markdownRef: { current: "# Document" },
      markdownEditorRef: { current: null },
      documentEditorRef: { current: null },
      onMarkdownChangeRef: { current: null },
    });

    actions.print();

    expect(print).toHaveBeenCalledOnce();
  });
});

describe("isSaveShortcut", () => {
  it("recognizes Ctrl+S and Cmd+S", () => {
    expect(isSaveShortcut({ key: "s", ctrlKey: true, metaKey: false })).toBe(
      true,
    );
    expect(isSaveShortcut({ key: "S", ctrlKey: false, metaKey: true })).toBe(
      true,
    );
  });

  it("ignores S without a save modifier", () => {
    expect(isSaveShortcut({ key: "s", ctrlKey: false, metaKey: false })).toBe(
      false,
    );
  });
});
