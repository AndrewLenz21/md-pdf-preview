// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import type { Editor } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DocumentEditor } from "./DocumentEditor";

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
});
