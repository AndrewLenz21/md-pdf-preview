// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  WorkspaceDocumentItem,
  WorkspaceItem,
} from "@/modules/dashboard/document/model/document.types";

import messages from "../../messages/en.json";
import { FolderTree } from "./FolderTree";

afterEach(() => {
  document.body.innerHTML = "";
});

function createDocument(): WorkspaceDocumentItem {
  return {
    id: "local-note",
    type: "document",
    parent_id: null,
    name: "Local note",
    created_at: "2026-08-28T00:00:00.000Z",
    updated_at: "2026-08-28T00:00:00.000Z",
    content: "# Local note",
    group: "documents",
  };
}

function renderLocalTree(
  items: WorkspaceItem[],
  onCreateDocument = vi.fn(),
  onCreateFolder = vi.fn(),
  cloudUnauthenticated = false,
) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ Dashboard: messages }}>
      <FolderTree
        items={items}
        source="local"
        selectedId={null}
        onSelect={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        onCopy={vi.fn()}
        onPaste={vi.fn()}
        canPaste={false}
        onToggleFavorite={vi.fn()}
        onCreateDocument={onCreateDocument}
        onCreateFolder={onCreateFolder}
        onCreateRootDocument={vi.fn()}
        onCreateRootFolder={vi.fn()}
        rootDropActive={false}
        onEditFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        collapsedFolderIds={[]}
        onToggleFolder={vi.fn()}
        cloudUnauthenticated={cloudUnauthenticated}
        mobile={false}
        onOpenFolderActions={vi.fn()}
        draggingItem={null}
        dropTargetFolderId={null}
        onDragPointerDown={vi.fn()}
        onDragClickCapture={vi.fn()}
      />
    </NextIntlClientProvider>,
  );
}

describe("FolderTree", () => {
  it("shows root actions for an empty Local workspace", () => {
    const onCreateDocument = vi.fn();
    const onCreateFolder = vi.fn();

    renderLocalTree([], onCreateDocument, onCreateFolder, true);

    fireEvent.click(
      screen.getByRole("button", { name: "Folder actions for Workspace" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "New folder" }));

    expect(onCreateFolder).toHaveBeenCalledWith(null);
  });

  it("keeps the root actions available after creating a root note", () => {
    renderLocalTree([createDocument()]);

    expect(
      document.querySelector('[data-tree-layout-id="document:local-note"]'),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Folder actions for Workspace" }),
    ).toBeTruthy();
  });
});
