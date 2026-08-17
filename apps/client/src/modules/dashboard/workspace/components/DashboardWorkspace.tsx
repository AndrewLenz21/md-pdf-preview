"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  MOCK_DOCUMENTS,
  SELECTED_DOCUMENT_ID,
} from "@/modules/dashboard/constants/mock-documents";
import { DocsSidebar } from "@/modules/dashboard/docs-sidebar";
import {
  DashboardBottomNav,
  type MobileDashboardSection,
} from "@/modules/dashboard/mobile-navigation";
import {
  DocumentPreview,
  PreviewZoomControl,
} from "@/modules/dashboard/preview";
import type { DocumentEditorMode } from "@/modules/dashboard/types/editor.types";

export function DashboardWorkspace() {
  const [documents, setDocuments] = useState(MOCK_DOCUMENTS);
  const [selectedDocumentId, setSelectedDocumentId] =
    useState(SELECTED_DOCUMENT_ID);
  const [mobileSection, setMobileSection] =
    useState<MobileDashboardSection>("preview");
  const [mobileTransitionDirection, setMobileTransitionDirection] = useState<
    "forward" | "backward"
  >("forward");
  const [editorMode, setEditorMode] = useState<DocumentEditorMode>("document");
  const [modeTransitionDirection, setModeTransitionDirection] = useState<
    "forward" | "backward" | null
  >(null);
  const mobileSectionScrollPositions = useRef<
    Record<MobileDashboardSection, number>
  >({ files: 0, preview: 0 });
  const isPreviewMode = editorMode === "preview";

  const saveMobileSectionScroll = (section: MobileDashboardSection) => {
    mobileSectionScrollPositions.current[section] = window.scrollY;
  };

  useLayoutEffect(() => {
    if (mobileSection !== "files") {
      return;
    }

    window.scrollTo({
      top: mobileSectionScrollPositions.current.files,
      behavior: "auto",
    });
  }, [mobileSection]);

  useEffect(() => {
    if (!modeTransitionDirection) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => setModeTransitionDirection(null),
      360,
    );

    return () => window.clearTimeout(timeoutId);
  }, [modeTransitionDirection]);
  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ??
    documents[0];

  const updateDocumentContent = (id: string, content: string) => {
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === id ? { ...document, content } : document,
      ),
    );
  };

  const updateSelectedDocumentContent = (content: string) => {
    updateDocumentContent(selectedDocument.id, content);
  };

  const changeEditorMode = (nextMode: DocumentEditorMode) => {
    if (nextMode === editorMode) {
      return;
    }

    const modeOrder: DocumentEditorMode[] = ["markdown", "document", "preview"];
    setModeTransitionDirection(
      modeOrder.indexOf(nextMode) > modeOrder.indexOf(editorMode)
        ? "forward"
        : "backward",
    );
    setEditorMode(nextMode);
  };

  const selectDocument = (id: string) => {
    saveMobileSectionScroll(mobileSection);
    setSelectedDocumentId(id);
    setMobileTransitionDirection("forward");
    setMobileSection("preview");
  };

  const changeMobileSection = (section: MobileDashboardSection) => {
    if (section === mobileSection) {
      return;
    }

    saveMobileSectionScroll(mobileSection);
    setMobileTransitionDirection(
      section === "preview" ? "forward" : "backward",
    );
    setMobileSection(section);
  };

  return (
    <div
      className={`min-h-screen bg-muted/30 text-foreground lg:flex ${isPreviewMode ? "overflow-x-hidden lg:h-screen lg:overflow-hidden" : "overflow-visible lg:h-auto"}`}
    >
      <aside className="hidden h-screen w-67.5 shrink-0 border-r border-border/80 bg-sidebar lg:sticky lg:top-0 lg:flex">
        <DocsSidebar
          documents={documents}
          selectedId={selectedDocument.id}
          onSelect={selectDocument}
        />
      </aside>

      <main
        className={`min-w-0 flex-1 pb-20 lg:pb-0 ${isPreviewMode ? "lg:h-screen lg:min-h-0" : "lg:h-auto lg:min-h-screen"}`}
      >
        <div className={`hidden lg:block ${isPreviewMode ? "h-full" : ""}`}>
          <DocumentPreview
            document={selectedDocument}
            mode={editorMode}
            scrollScope="desktop"
            onModeChange={changeEditorMode}
            onContentChange={updateSelectedDocumentContent}
            modeTransitionDirection={modeTransitionDirection}
          />
          <PreviewZoomControl mode={editorMode} />
        </div>
        <div
          className={`relative lg:hidden ${isPreviewMode ? "overflow-hidden" : ""}`}
        >
          <div
            key={mobileSection}
            className={`dashboard-mobile-section dashboard-mobile-section-${mobileTransitionDirection}`}
          >
            {mobileSection === "files" ? (
              <DocsSidebar
                documents={documents}
                selectedId={selectedDocument.id}
                onSelect={selectDocument}
                mobile
              />
            ) : (
              <DocumentPreview
                document={selectedDocument}
                mode={editorMode}
                scrollScope="mobile"
                onModeChange={changeEditorMode}
                onContentChange={updateSelectedDocumentContent}
                modeTransitionDirection={modeTransitionDirection}
              />
            )}
          </div>
        </div>
        {mobileSection === "preview" ? (
          <div className="lg:hidden">
            <PreviewZoomControl mode={editorMode} isMobile />
          </div>
        ) : null}
      </main>

      <DashboardBottomNav
        activeSection={mobileSection}
        onChange={changeMobileSection}
      />
    </div>
  );
}
