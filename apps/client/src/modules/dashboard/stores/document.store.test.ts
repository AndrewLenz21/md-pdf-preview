import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MOCK_DOCUMENTS,
  SELECTED_DOCUMENT_ID,
} from "@/modules/dashboard/constants/mock-documents";

import {
  DOCUMENT_CONTENT_DEBOUNCE_MS,
  MAX_MARKDOWN_CHARACTERS,
  useDocumentStore,
} from "./document.store";

function getContent(documentId = SELECTED_DOCUMENT_ID) {
  return useDocumentStore
    .getState()
    .documents.find((document) => document.id === documentId)?.content;
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
    ).toBe("Final draft");

    vi.advanceTimersByTime(DOCUMENT_CONTENT_DEBOUNCE_MS - 1);
    expect(getContent()).toBe(initialContent);

    vi.advanceTimersByTime(1);
    expect(getContent()).toBe("Final draft");
    expect(
      useDocumentStore.getState().pendingContentByDocumentId[
        SELECTED_DOCUMENT_ID
      ],
    ).toBeUndefined();
  });

  it("flushes pending content immediately", () => {
    useDocumentStore
      .getState()
      .scheduleContentUpdate(SELECTED_DOCUMENT_ID, "Pending draft");

    useDocumentStore.getState().flushPendingContent(SELECTED_DOCUMENT_ID);

    expect(getContent()).toBe("Pending draft");
    vi.advanceTimersByTime(DOCUMENT_CONTENT_DEBOUNCE_MS);
    expect(getContent()).toBe("Pending draft");
  });

  it("flushes the current document before selecting another one", () => {
    const nextDocumentId = "product-proposal";

    useDocumentStore
      .getState()
      .scheduleContentUpdate(SELECTED_DOCUMENT_ID, "Saved before switching");
    useDocumentStore.getState().selectDocument(nextDocumentId);

    expect(useDocumentStore.getState().selectedDocumentId).toBe(nextDocumentId);
    expect(getContent(SELECTED_DOCUMENT_ID)).toBe("Saved before switching");
  });

  it("limits Markdown to 20000 characters and still allows deleting", () => {
    const atLimit = "a".repeat(MAX_MARKDOWN_CHARACTERS);

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
});
