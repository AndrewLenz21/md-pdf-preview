// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { Editor } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MOCK_DOCUMENTS } from "@/modules/dashboard/constants/mock-documents";

import { DocumentEditor } from "./DocumentEditor";
import { tiptapToMarkdown } from "./markdown/tiptapToMarkdown";

describe("DocumentEditor", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders a continuous editable document without paper chrome", () => {
    render(
      <DocumentEditor
        markdown={"# Project Research\n\nThis is **important**."}
        zoom={100}
        onMarkdownChange={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: "Project Research" })).toBeTruthy();
    expect(screen.getByText("important")).toBeTruthy();
    expect(document.querySelector("[contenteditable=\"true\"]")).toBeTruthy();
    expect(document.querySelector(".document-page-frame")).toBeNull();
    expect(document.querySelector(".document-page-footer")).toBeNull();
    expect(document.querySelector(".document-page-gap")).toBeNull();
  });

  it("renders a Markdown image as a standalone image block", () => {
    const editorRef = { current: null as Editor | null };

    render(
      <DocumentEditor
        markdown={"![Vista aerea](https://example.com/city.jpg)"}
        zoom={100}
        editorRef={editorRef}
      />,
    );

    const editor = editorRef.current;
    expect(editor).toBeTruthy();

    const types = (editor?.state.doc.content.content ?? []).map(
      (node) => node.type.name,
    );

    expect(types).toEqual(["image", "paragraph"]);
  });

  it("serializes an image block back to Markdown", () => {
    vi.useFakeTimers();
    const editorRef = { current: null as Editor | null };
    const onMarkdownChange = vi.fn();

    render(
      <DocumentEditor
        markdown={"Initial paragraph."}
        zoom={100}
        editorRef={editorRef}
        onMarkdownChange={onMarkdownChange}
      />,
    );

    const editor = editorRef.current;
    expect(editor).toBeTruthy();
    editor?.commands.setContent({
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            src: "https://example.com/city.jpg",
            alt: "Vista aerea",
            title: null,
          },
        },
      ],
    });
    vi.advanceTimersByTime(100);

    const serialized = onMarkdownChange.mock.calls.at(-1)?.[0] ?? "";

    expect(serialized).toContain(
      "![Vista aerea](https://example.com/city.jpg)",
    );
  });

  it("renders callouts as semantic editable blocks", () => {
    render(
      <DocumentEditor
        markdown={"<aside>\n💡 **Core idea:** Keep it semantic.\n</aside>"}
        zoom={100}
        onMarkdownChange={() => undefined}
      />,
    );

    expect(document.querySelector(".document-callout")).toBeTruthy();
    expect(document.querySelector(".document-callout-icon")?.textContent).toBe("💡");
    expect(screen.getByText("Core idea:")).toBeTruthy();
    expect(document.querySelector("[contenteditable=\"true\"]")).toBeTruthy();
  });

  it("renders a language selector for fenced code blocks", async () => {
    const onMarkdownChange = vi.fn();

    render(
      <DocumentEditor
        markdown={"```javascript\nconst value = 1;\n```"}
        zoom={100}
        onMarkdownChange={onMarkdownChange}
      />,
    );

    const languageSelect = (await screen.findByRole("combobox", {
      name: "Code language",
    })) as HTMLSelectElement;

    expect(languageSelect.value).toBe("javascript");
    fireEvent.change(languageSelect, { target: { value: "typescript" } });

    await waitFor(() =>
      expect(onMarkdownChange).toHaveBeenLastCalledWith(
        "```typescript\nconst value = 1;\n```",
      ),
    );
  });

  it("offers copy and delete actions for fenced code blocks", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    try {
      render(
        <DocumentEditor
          markdown={"```javascript\nconst value = 1;\n```"}
          zoom={100}
          onMarkdownChange={() => undefined}
        />,
      );

      fireEvent.click(await screen.findByRole("button", { name: "Copy code" }));
      await waitFor(() => expect(writeText).toHaveBeenCalledWith("const value = 1;"));

      const moreOptions = document.querySelector(
        '[aria-label="More code block options"]',
      );
      expect(moreOptions).toBeTruthy();
      fireEvent.click(moreOptions!);
      fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

      await waitFor(() =>
        expect(document.querySelector(".document-code-block")).toBeNull(),
      );
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: originalClipboard,
      });
    }
  });

  it("renders task items as semantic checkbox controls with their checked state", () => {
    render(
      <DocumentEditor
        markdown={"- [ ] Open task\n- [x] Completed task"}
        zoom={100}
        onMarkdownChange={() => undefined}
      />,
    );

    const items = document.querySelectorAll(
      'ul[data-type="taskList"] > li.document-task-item',
    );
    const checkboxes = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        'ul[data-type="taskList"] input[type="checkbox"]',
      ),
    );

    expect(items).toHaveLength(2);
    expect(checkboxes.map((checkbox) => checkbox.checked)).toEqual([false, true]);
    expect(document.querySelector('li[data-checked="true"]')).toBeTruthy();
  });

  it("parses Markdown clipboard content while leaving ordinary text to native paste", () => {
    const editorRef = { current: null as Editor | null };

    render(
      <DocumentEditor
        markdown="Existing content."
        zoom={100}
        editorRef={editorRef}
        onMarkdownChange={() => undefined}
      />,
    );

    const editor = editorRef.current;
    expect(editor).toBeTruthy();

    const createPasteEvent = (text: string) =>
      ({
        clipboardData: {
          getData: (type: string) => (type === "text/plain" ? text : ""),
        },
        preventDefault: vi.fn(),
      }) as unknown as ClipboardEvent;
    const markdownEvent = createPasteEvent("# Pasted heading\n\n**Pasted text**");
    let markdownHandled = false;

    editor?.view.someProp("handlePaste", (handler) => {
      if (handler(editor!.view, markdownEvent, Slice.empty)) {
        markdownHandled = true;
        return true;
      }

      return false;
    });

    expect(markdownHandled).toBe(true);
    expect(markdownEvent.preventDefault).toHaveBeenCalledOnce();
    expect(editor?.getJSON().content?.some((node) => node.type === "heading")).toBe(true);

    const plainEvent = createPasteEvent("ordinary text");
    let plainHandled = false;

    editor?.view.someProp("handlePaste", (handler) => {
      if (handler(editor!.view, plainEvent, Slice.empty)) {
        plainHandled = true;
        return true;
      }

      return false;
    });

    expect(plainHandled).toBe(false);
    expect(plainEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("targets zoom at the content host without scaling the workspace", () => {
    const { rerender } = render(
      <DocumentEditor
        markdown="Readable content."
        zoom={80}
        onMarkdownChange={() => undefined}
      />,
    );

    const workspace = document.querySelector<HTMLElement>(
      ".document-editor-workspace",
    );
    const contentHost = document.querySelector<HTMLElement>(
      ".document-editor-content-host",
    );

    expect(workspace?.style.cssText).toBe("");
    expect(contentHost?.style.getPropertyValue("--document-editor-zoom")).toBe(
      "0.8",
    );

    rerender(
      <DocumentEditor
        markdown="Readable content."
        zoom={120}
        onMarkdownChange={() => undefined}
      />,
    );

    expect(contentHost?.style.getPropertyValue("--document-editor-zoom")).toBe(
      "1.2",
    );
  });

  it("updates from an external canonical Markdown change without remounting paper UI", () => {
    const { rerender } = render(
      <DocumentEditor
        markdown="Initial paragraph."
        zoom={100}
        onMarkdownChange={() => undefined}
      />,
    );

    const editor = document.querySelector<HTMLElement>("[contenteditable=\"true\"]");

    expect(editor).toBeTruthy();
    rerender(
      <DocumentEditor
        markdown={"# Updated heading\n\nUpdated paragraph."}
        zoom={100}
        onMarkdownChange={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: "Updated heading" })).toBeTruthy();
    expect(screen.getByText("Updated paragraph.")).toBeTruthy();
    expect(document.querySelector("[contenteditable=\"true\"]")).toBe(editor);
    expect(document.querySelector(".document-page-frame")).toBeNull();
  });

  it("serializes editor transactions back into canonical Markdown", () => {
    vi.useFakeTimers();
    const editorRef = { current: null as Editor | null };
    const onMarkdownChange = vi.fn();

    render(
      <DocumentEditor
        markdown="Initial paragraph."
        zoom={100}
        editorRef={editorRef}
        onMarkdownChange={onMarkdownChange}
      />,
    );

    editorRef.current?.commands.setContent({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Updated section" }],
        },
      ],
    });
    vi.advanceTimersByTime(100);

    expect(onMarkdownChange).toHaveBeenCalledWith("## Updated section");
  });

  it("serializes an empty paragraph inserted after the non-goals heading", () => {
    vi.useFakeTimers();
    const editorRef = { current: null as Editor | null };
    const onMarkdownChange = vi.fn();
    const markdown = "## 🚫 Explicit Non-Goals\n\nKeep the scope controlled.";

    render(
      <DocumentEditor
        markdown={markdown}
        zoom={100}
        editorRef={editorRef}
        onMarkdownChange={onMarkdownChange}
      />,
    );

    const editor = editorRef.current;
    expect(editor).toBeTruthy();

    let headingEnd = 0;
    editor?.state.doc.descendants((node, position) => {
      if (node.type.name === "heading") {
        headingEnd = position + node.nodeSize - 1;
      }
    });
    editor?.commands.setTextSelection(headingEnd);
    editor?.commands.splitBlock();
    vi.advanceTimersByTime(100);

    expect(onMarkdownChange).toHaveBeenCalledWith(
      "## 🚫 Explicit Non-Goals\n\n\nKeep the scope controlled.",
    );
  });

  it("serializes the non-goals heading in the product proposal", () => {
    vi.useFakeTimers();
    const editorRef = { current: null as Editor | null };
    const onMarkdownChange = vi.fn();
    const markdown = MOCK_DOCUMENTS.find(
      (document) => document.id === "product-proposal",
    )?.content ?? "";

    render(
      <DocumentEditor
        markdown={markdown}
        zoom={100}
        editorRef={editorRef}
        onMarkdownChange={onMarkdownChange}
      />,
    );

    const editor = editorRef.current;
    expect(editor).toBeTruthy();

    let headingEnd = 0;
    editor?.state.doc.descendants((node, position) => {
      if (
        node.type.name === "heading" &&
        node.textContent.includes("Explicit Non-Goals")
      ) {
        headingEnd = position + node.nodeSize - 1;
      }
    });
    expect(headingEnd).toBeGreaterThan(0);
    editor?.commands.setTextSelection(headingEnd);
    editor?.commands.splitBlock();
    vi.advanceTimersByTime(100);

    expect(onMarkdownChange.mock.calls.at(-1)?.[0]).toContain(
      "## 🚫 Explicit Non-Goals\n\n\nKeep the scope controlled.",
    );
  });

  it("serializes the Phase 3 heading in the product proposal", () => {
    vi.useFakeTimers();
    const editorRef = { current: null as Editor | null };
    const onMarkdownChange = vi.fn();
    const markdown = MOCK_DOCUMENTS.find(
      (document) => document.id === "product-proposal",
    )?.content ?? "";

    render(
      <DocumentEditor
        markdown={markdown}
        zoom={100}
        editorRef={editorRef}
        onMarkdownChange={onMarkdownChange}
      />,
    );

    const editor = editorRef.current;
    expect(editor).toBeTruthy();

    let headingEnd = 0;
    editor?.state.doc.descendants((node, position) => {
      if (
        node.type.name === "heading" &&
        node.textContent.includes("Phase 3 — Local history")
      ) {
        headingEnd = position + node.nodeSize - 1;
      }
    });
    expect(headingEnd).toBeGreaterThan(0);
    editor?.commands.setTextSelection(headingEnd);
    editor?.commands.splitBlock();
    vi.advanceTimersByTime(100);

    expect(onMarkdownChange.mock.calls.at(-1)?.[0]).toContain(
      "### Phase 3 — Local history\n\n\n- [ ] Save previews locally.",
    );
  });

  it("serializes an empty paragraph between a heading and a task list", () => {
    vi.useFakeTimers();
    const editorRef = { current: null as Editor | null };
    const onMarkdownChange = vi.fn();
    const markdown = [
      "### Phase 3 — Local history",
      "",
      "- [ ] Save previews locally.",
      "- [ ] Reopen/edit previous documents.",
    ].join("\n");

    render(
      <DocumentEditor
        markdown={markdown}
        zoom={100}
        editorRef={editorRef}
        onMarkdownChange={onMarkdownChange}
      />,
    );

    const editor = editorRef.current;
    expect(editor).toBeTruthy();

    let headingEnd = 0;
    editor?.state.doc.descendants((node, position) => {
      if (node.type.name === "heading") {
        headingEnd = position + node.nodeSize - 1;
      }
    });
    editor?.commands.setTextSelection(headingEnd);
    editor?.commands.splitBlock();
    vi.advanceTimersByTime(100);

    expect(tiptapToMarkdown(editor!)).toContain(
      "### Phase 3 — Local history\n\n\n- [ ] Save previews locally.",
    );
    expect(onMarkdownChange.mock.calls.at(-1)?.[0]).toContain(
      "### Phase 3 — Local history\n\n\n- [ ] Save previews locally.",
    );
  });

  it("serializes another Enter when a blank space already precedes the task list", () => {
    vi.useFakeTimers();
    const editorRef = { current: null as Editor | null };
    const onMarkdownChange = vi.fn();
    const markdown = [
      "### Phase 3 — Local history",
      "",
      "",
      "- [ ] Save previews locally.",
      "- [ ] Reopen/edit previous documents.",
    ].join("\n");

    render(
      <DocumentEditor
        markdown={markdown}
        zoom={100}
        editorRef={editorRef}
        onMarkdownChange={onMarkdownChange}
      />,
    );

    const editor = editorRef.current;
    expect(editor).toBeTruthy();

    let headingEnd = 0;
    editor?.state.doc.descendants((node, position) => {
      if (node.type.name === "heading") {
        headingEnd = position + node.nodeSize - 1;
      }
    });
    editor?.commands.setTextSelection(headingEnd);
    editor?.commands.splitBlock();
    vi.advanceTimersByTime(100);

    expect(onMarkdownChange).toHaveBeenCalled();
    expect(onMarkdownChange.mock.calls.at(-1)?.[0]).not.toBe(markdown);
  });

  it("serializes a physical Enter before a task list", () => {
    vi.useFakeTimers();
    const editorRef = { current: null as Editor | null };
    const onMarkdownChange = vi.fn();
    const markdown = [
      "### Phase 3 — Local history",
      "",
      "- [ ] Save previews locally.",
      "- [ ] Reopen/edit previous documents.",
    ].join("\n");

    render(
      <DocumentEditor
        markdown={markdown}
        zoom={100}
        editorRef={editorRef}
        onMarkdownChange={onMarkdownChange}
      />,
    );

    const editor = editorRef.current;
    expect(editor).toBeTruthy();

    let headingEnd = 0;
    editor?.state.doc.descendants((node, position) => {
      if (node.type.name === "heading") {
        headingEnd = position + node.nodeSize - 1;
      }
    });
    editor?.commands.setTextSelection(headingEnd);
    fireEvent.keyDown(editor!.view.dom, {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
    });
    vi.advanceTimersByTime(100);

    expect(onMarkdownChange.mock.calls.at(-1)?.[0]).toContain(
      "### Phase 3 — Local history\n\n\n- [ ] Save previews locally.",
    );
  });

  it("serializes a physical Enter in Phase 3 of the full product proposal", () => {
    vi.useFakeTimers();
    const editorRef = { current: null as Editor | null };
    const onMarkdownChange = vi.fn();
    const markdown = MOCK_DOCUMENTS.find(
      (document) => document.id === "product-proposal",
    )?.content ?? "";

    render(
      <DocumentEditor
        markdown={markdown}
        zoom={100}
        editorRef={editorRef}
        onMarkdownChange={onMarkdownChange}
      />,
    );

    const editor = editorRef.current;
    expect(editor).toBeTruthy();

    let headingEnd = 0;
    editor?.state.doc.descendants((node, position) => {
      if (
        node.type.name === "heading" &&
        node.textContent.includes("Phase 3 — Local history")
      ) {
        headingEnd = position + node.nodeSize - 1;
      }
    });
    expect(headingEnd).toBeGreaterThan(0);
    editor?.commands.setTextSelection(headingEnd);
    fireEvent.keyDown(editor!.view.dom, {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
    });
    vi.advanceTimersByTime(100);

    expect(onMarkdownChange.mock.calls.at(-1)?.[0]).toContain(
      "### Phase 3 — Local history\n\n\n- [ ] Save previews locally.",
    );
  });

  it("serializes Enter pressed inside an existing blank-space node", () => {
    vi.useFakeTimers();
    const editorRef = { current: null as Editor | null };
    const onMarkdownChange = vi.fn();
    const markdown = [
      "### Phase 3 — Local history",
      "",
      "",
      "- [ ] Save previews locally.",
      "- [ ] Reopen/edit previous documents.",
    ].join("\n");

    render(
      <DocumentEditor
        markdown={markdown}
        zoom={100}
        editorRef={editorRef}
        onMarkdownChange={onMarkdownChange}
      />,
    );

    const editor = editorRef.current;
    expect(editor).toBeTruthy();

    let blankSpacePosition = 0;
    editor?.state.doc.descendants((node, position) => {
      if (node.type.name === "blankSpace") {
        blankSpacePosition = position;
      }
    });
    expect(blankSpacePosition).toBeGreaterThan(0);
    editor?.commands.setTextSelection(blankSpacePosition + 1);
    fireEvent.keyDown(editor!.view.dom, {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
    });
    vi.advanceTimersByTime(100);

    expect(onMarkdownChange).toHaveBeenCalled();
  });

  it("restores the list break instead of exposing its serializer token", () => {
    vi.useFakeTimers();
    const editorRef = { current: null as Editor | null };
    const onMarkdownChange = vi.fn();

    render(
      <DocumentEditor
        markdown={"### Phase 2 — Layout controls\n\n- [ ] Better handling for images, callouts, and code blocks.\n\n### Phase 3 — Local history"}
        zoom={100}
        editorRef={editorRef}
        onMarkdownChange={onMarkdownChange}
      />,
    );

    const editor = editorRef.current;
    expect(editor).toBeTruthy();
    editor?.commands.setContent({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Phase 2 — Layout controls" }],
        },
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Better handling for images, callouts, and code blocks.",
                    },
                  ],
                },
              ],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph" }],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Phase 3 — Local history" }],
        },
      ],
    });
    vi.advanceTimersByTime(100);

    const serialized = onMarkdownChange.mock.calls.at(-1)?.[0] ?? "";

    expect(serialized).not.toContain("DOCUMENT_EMPTY_LIST_BREAK");
    expect(serialized).toContain(
      "- [ ] Better handling for images, callouts, and code blocks.\n\n\n### Phase 3 — Local history",
    );
  });
});
