// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { createEditingActions } from "./editingActions";

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
