import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MOCK_DOCUMENTS,
  SELECTED_DOCUMENT_ID,
} from "@/modules/dashboard/constants/mock-documents";

import {
  DOCUMENT_CONTENT_DEBOUNCE_MS,
  MAX_MARKDOWN_CHARACTERS,
  normalizeMarkdownDocument,
  useDocumentStore,
} from "./document.store";

function getContent(documentId = SELECTED_DOCUMENT_ID) {
  return useDocumentStore
    .getState()
    .documents.find((document) => document.id === documentId)?.content;
}

function getTitle(documentId = SELECTED_DOCUMENT_ID) {
  return useDocumentStore
    .getState()
    .documents.find((document) => document.id === documentId)?.title;
}

function resetStore() {
  useDocumentStore.getState().flushAllPendingContent();
  useDocumentStore.setState({
    documents: MOCK_DOCUMENTS,
    pendingContentByDocumentId: {},
    selectedDocumentId: SELECTED_DOCUMENT_ID,
  });
}

describe("document store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
  });

  afterEach(() => {
    resetStore();
    vi.useRealTimers();
  });

  it("commits only the latest content after the debounce window", () => {
    const initialContent = getContent();
    const expectedContent = normalizeMarkdownDocument("Final draft").content;

    useDocumentStore
      .getState()
      .scheduleContentUpdate(SELECTED_DOCUMENT_ID, "First draft");
    useDocumentStore
      .getState()
      .scheduleContentUpdate(SELECTED_DOCUMENT_ID, "Final draft");

    expect(getContent()).toBe(initialContent);
    expect(
      useDocumentStore.getState().pendingContentByDocumentId[
        SELECTED_DOCUMENT_ID
      ],
    ).toBe(expectedContent);

    vi.advanceTimersByTime(DOCUMENT_CONTENT_DEBOUNCE_MS - 1);
    expect(getContent()).toBe(initialContent);

    vi.advanceTimersByTime(1);
    expect(getContent()).toBe(expectedContent);
    expect(
      useDocumentStore.getState().pendingContentByDocumentId[
        SELECTED_DOCUMENT_ID
      ],
    ).toBeUndefined();
  });

  it("flushes pending content immediately", () => {
    const expectedContent = normalizeMarkdownDocument("Pending draft").content;

    useDocumentStore
      .getState()
      .scheduleContentUpdate(SELECTED_DOCUMENT_ID, "Pending draft");

    useDocumentStore.getState().flushPendingContent(SELECTED_DOCUMENT_ID);

    expect(getContent()).toBe(expectedContent);
    vi.advanceTimersByTime(DOCUMENT_CONTENT_DEBOUNCE_MS);
    expect(getContent()).toBe(expectedContent);
  });

  it("flushes the current document before selecting another one", () => {
    const nextDocumentId = "product-proposal";
    const expectedContent = normalizeMarkdownDocument(
      "Saved before switching",
    ).content;

    useDocumentStore
      .getState()
      .scheduleContentUpdate(SELECTED_DOCUMENT_ID, "Saved before switching");
    useDocumentStore.getState().selectDocument(nextDocumentId);

    expect(useDocumentStore.getState().selectedDocumentId).toBe(nextDocumentId);
    expect(getContent(SELECTED_DOCUMENT_ID)).toBe(expectedContent);
  });

  it("limits Markdown to 20000 characters and still allows deleting", () => {
    const titlePrefix = "# Untitled\n\n";
    const atLimit = `${titlePrefix}${"a".repeat(
      MAX_MARKDOWN_CHARACTERS - titlePrefix.length,
    )}`;

    useDocumentStore
      .getState()
      .scheduleContentUpdate(SELECTED_DOCUMENT_ID, `${atLimit}b`);

    expect(
      useDocumentStore.getState().pendingContentByDocumentId[
        SELECTED_DOCUMENT_ID
      ],
    ).toBe(atLimit);

    useDocumentStore.getState().flushPendingContent(SELECTED_DOCUMENT_ID);
    expect(getContent()).toBe(atLimit);

    const afterDelete = atLimit.slice(0, -1);
    useDocumentStore
      .getState()
      .scheduleContentUpdate(SELECTED_DOCUMENT_ID, afterDelete);
    useDocumentStore.getState().flushPendingContent(SELECTED_DOCUMENT_ID);

    expect(getContent()).toBe(afterDelete);
  });

  it("uses the first H1 as the document title", () => {
    const markdown = "\n\n# 📝 New title\n\nDocument content.";

    useDocumentStore
      .getState()
      .scheduleContentUpdate(SELECTED_DOCUMENT_ID, markdown);
    useDocumentStore.getState().flushPendingContent(SELECTED_DOCUMENT_ID);

    expect(getContent()).toBe("# 📝 New title\n\nDocument content.");
    expect(getTitle()).toBe("📝 New title");
  });

  it("adds an Untitled H1 when the first block is not a heading", () => {
    const markdown = "Paragraph first.\n\n# A later section";
    const expected = "# Untitled\n\nParagraph first.\n\n# A later section";

    useDocumentStore
      .getState()
      .scheduleContentUpdate(SELECTED_DOCUMENT_ID, markdown);
    useDocumentStore.getState().flushPendingContent(SELECTED_DOCUMENT_ID);

    expect(getContent()).toBe(expected);
    expect(getTitle()).toBe("Untitled");
  });

  it("keeps an empty first H1 without adding another heading", () => {
    const markdown = "#\n\nDocument content.";

    useDocumentStore
      .getState()
      .scheduleContentUpdate(SELECTED_DOCUMENT_ID, markdown);
    useDocumentStore.getState().flushPendingContent(SELECTED_DOCUMENT_ID);

    expect(getContent()).toBe(markdown);
    expect(getContent()?.match(/^#/gm)).toHaveLength(1);
    expect(getTitle()).toBe("Untitled");
  });
});
