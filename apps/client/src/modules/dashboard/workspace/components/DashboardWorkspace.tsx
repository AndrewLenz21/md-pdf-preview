"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { DocsSidebar } from "@/modules/dashboard/docs-sidebar";
import {
  DashboardBottomNav,
  type MobileDashboardSection,
} from "@/modules/dashboard/mobile-navigation";
import {
  useDocumentEditorStore,
  useDocumentStore,
  useWorkspaceStore,
} from "@/modules/dashboard/stores";
import {
  DocumentPreview,
  PreviewPaneToolbar,
  PreviewToolbar,
  PreviewZoomControl,
} from "@/modules/dashboard/preview";
import type { EditingActions } from "@/modules/dashboard/preview/utils/editingActions";
import type { DocumentEditorMode } from "@/modules/dashboard/types/editor.types";
import { LanguageDialog } from "@/modules/navigation/components/LanguageDialog";
import { SettingsDialog } from "@/modules/navigation/components/SettingsDialog";
import { ThemeDialog } from "@/modules/navigation/components/ThemeDialog";
import { attachDocumentPageBreakMarkers } from "../utils/documentPageBreakMarkers";
import { attachDocumentScrollSync } from "../utils/documentScrollSync";

export function DashboardWorkspace() {
  const documents = useDocumentStore((state) => state.documents);
  const selectedDocumentId = useDocumentStore(
    (state) => state.selectedDocumentId,
  );
  const selectDocumentInStore = useDocumentStore(
    (state) => state.selectDocument,
  );
  const scheduleContentUpdate = useDocumentStore(
    (state) => state.scheduleContentUpdate,
  );
  const flushPendingContent = useDocumentStore(
    (state) => state.flushPendingContent,
  );
  const initializeWorkspaceZoom = useWorkspaceStore(
    (state) => state.initializeViewportZoom,
  );
  const initializeDocumentEditorZoom = useDocumentEditorStore(
    (state) => state.initializeViewportZoom,
  );
  const [mobileSection, setMobileSection] =
    useState<MobileDashboardSection>("preview");
  const [docsSidebarModal, setDocsSidebarModal] = useState<
    "language" | "settings" | "theme" | null
  >(null);
  const [mobileTransitionDirection, setMobileTransitionDirection] = useState<
    "forward" | "backward"
  >("forward");
  const [editorMode, setEditorMode] = useState<DocumentEditorMode>("document");
  const [modeTransitionDirection, setModeTransitionDirection] = useState<
    "forward" | "backward" | null
  >(null);
  const isPreviewMode = editorMode === "preview";
  const [desktopPreviewVisible, setDesktopPreviewVisible] =
    useState(isPreviewMode);
  const [desktopEditingActions, setDesktopEditingActions] =
    useState<EditingActions | null>(null);
  const [documentPageBreakMarkers, setDocumentPageBreakMarkers] = useState<
    number[]
  >([]);
  const [mobilePageBreakMarkers, setMobilePageBreakMarkers] = useState<number[]>(
    [],
  );
  const pageBreakMarkerDocumentIdRef = useRef(selectedDocumentId);
  const desktopDocumentScrollRef = useRef<HTMLDivElement | null>(null);
  const desktopPreviewScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileDocumentScrollRef = useRef<HTMLDivElement | null>(null);
  const mobilePageBreakPreviewRef = useRef<HTMLDivElement | null>(null);
  const mobileSectionScrollPositions = useRef<
    Record<MobileDashboardSection, number>
  >({ files: 0, preview: 0 });
  const isDesktopSplit = isPreviewMode || desktopPreviewVisible;
  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ??
    documents[0];

  useLayoutEffect(() => {
    const isSmallScreen =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1023px)").matches;

    initializeWorkspaceZoom(isSmallScreen);
    initializeDocumentEditorZoom(isSmallScreen);
  }, [initializeDocumentEditorZoom, initializeWorkspaceZoom]);

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

  useEffect(() => {
    if (isPreviewMode || !desktopPreviewVisible) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => setDesktopPreviewVisible(false),
      320,
    );

    return () => window.clearTimeout(timeoutId);
  }, [desktopPreviewVisible, isPreviewMode]);

  useEffect(() => {
    if (!isPreviewMode) {
      return;
    }

    return attachDocumentScrollSync(
      desktopDocumentScrollRef.current,
      desktopPreviewScrollRef.current,
    );
  }, [desktopPreviewVisible, isPreviewMode, mobileSection, selectedDocument.id]);

  useEffect(() => {
    if (pageBreakMarkerDocumentIdRef.current === selectedDocument.id) {
      return;
    }

    pageBreakMarkerDocumentIdRef.current = selectedDocument.id;
    setDocumentPageBreakMarkers([]);
    setMobilePageBreakMarkers([]);
  }, [selectedDocument.id]);

  useEffect(() => {
    if (!desktopPreviewVisible) {
      return;
    }

    return attachDocumentPageBreakMarkers(
      desktopDocumentScrollRef.current,
      desktopPreviewScrollRef.current,
      setDocumentPageBreakMarkers,
    );
  }, [
    desktopPreviewVisible,
    isPreviewMode,
    mobileSection,
    selectedDocument.id,
  ]);

  useEffect(() => {
    if (mobileSection !== "preview" || editorMode !== "document") {
      return;
    }

    return attachDocumentPageBreakMarkers(
      mobileDocumentScrollRef.current,
      mobilePageBreakPreviewRef.current,
      setMobilePageBreakMarkers,
    );
  }, [editorMode, mobileSection, selectedDocument.id]);
  const changeEditorMode = (nextMode: DocumentEditorMode) => {
    if (nextMode === editorMode) {
      return;
    }

    flushPendingContent(selectedDocument.id);

    if (nextMode === "preview") {
      setDesktopPreviewVisible(true);
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
    selectDocumentInStore(id);
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

  const openDocsSidebarSettings = () => setDocsSidebarModal("settings");

  return (
    <div
      className={`dashboard-workspace min-h-screen bg-muted/30 text-foreground lg:flex ${isDesktopSplit ? "overflow-x-hidden lg:h-screen lg:overflow-hidden" : "overflow-visible lg:h-auto"}`}
    >
      <aside className="hidden h-screen w-67.5 shrink-0 border-r border-border/80 bg-sidebar lg:sticky lg:top-0 lg:flex">
        <DocsSidebar
          documents={documents}
          selectedId={selectedDocument.id}
          onSelect={selectDocument}
          onOpenSettings={openDocsSidebarSettings}
        />
      </aside>

      <main
        className={`min-w-0 flex-1 pb-20 lg:pb-0 ${isDesktopSplit ? "lg:h-screen lg:min-h-0" : "lg:h-auto lg:min-h-screen"}`}
      >
        <div
          className={`hidden ${isDesktopSplit ? "lg:flex h-full min-h-0 flex-col" : "lg:block"}`}
        >
          <PreviewToolbar
            document={selectedDocument}
            mode={editorMode}
            onModeChange={changeEditorMode}
            editingActions={desktopEditingActions}
            splitMode={isPreviewMode}
          />
          <div
            className={isDesktopSplit ? "flex h-0 min-h-0 min-w-0 flex-1" : "min-w-0"}
          >
            <section
              className={`relative h-full min-h-0 min-w-0 transition-[width] duration-300 ease-out ${isDesktopSplit ? (isPreviewMode ? "w-1/2" : "w-full") : "w-full"}`}
            >
              <DocumentPreview
                document={selectedDocument}
                mode={isPreviewMode ? "document" : editorMode}
                embedded={isDesktopSplit}
                showToolbar={false}
                scrollScope="desktop"
                onModeChange={changeEditorMode}
                onContentChange={(content) =>
                  scheduleContentUpdate(selectedDocument.id, content)
                }
                onEditingActionsChange={setDesktopEditingActions}
                scrollContainerRef={desktopDocumentScrollRef}
                pageBreakMarkers={documentPageBreakMarkers}
                modeTransitionDirection={modeTransitionDirection}
              />
              <PreviewZoomControl
                mode={isPreviewMode ? "document" : editorMode}
                embedded={isDesktopSplit}
              />
            </section>
            {desktopPreviewVisible ? (
              <section
                aria-hidden={!isPreviewMode}
                className={`relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden transition-[width,opacity,transform] duration-300 ease-out ${isPreviewMode ? "dashboard-desktop-preview-enter w-1/2 translate-x-0 opacity-100" : "pointer-events-none w-0 translate-x-4 opacity-0"}`}
              >
                <PreviewPaneToolbar editingActions={desktopEditingActions} />
                <div className="min-h-0 min-w-0 flex-1">
                  <DocumentPreview
                    document={selectedDocument}
                    mode="preview"
                    embedded
                    showToolbar={false}
                    scrollScope="desktop"
                    onModeChange={changeEditorMode}
                    onContentChange={(content) =>
                      scheduleContentUpdate(selectedDocument.id, content)
                    }
                    scrollContainerRef={desktopPreviewScrollRef}
                  />
                </div>
                {isPreviewMode ? (
                  <PreviewZoomControl mode="preview" embedded />
                ) : null}
              </section>
            ) : null}
          </div>
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
                onOpenSettings={openDocsSidebarSettings}
                mobile
              />
            ) : (
              <DocumentPreview
                document={selectedDocument}
                mode={editorMode}
                scrollScope="mobile"
                onModeChange={changeEditorMode}
                onContentChange={(content) =>
                  scheduleContentUpdate(selectedDocument.id, content)
                }
                modeTransitionDirection={modeTransitionDirection}
                pageBreakMarkers={mobilePageBreakMarkers}
                scrollContainerRef={mobileDocumentScrollRef}
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

      <div aria-hidden="true" className="print-document-preview">
        <DocumentPreview
          document={selectedDocument}
          mode="preview"
          scrollScope="mobile"
          disableScrollSync
          showToolbar={false}
          onModeChange={() => undefined}
          onContentChange={() => undefined}
          scrollContainerRef={mobilePageBreakPreviewRef}
        />
      </div>

      <DashboardBottomNav
        activeSection={mobileSection}
        onChange={changeMobileSection}
      />

      <SettingsDialog
        open={docsSidebarModal === "settings"}
        onClose={() => setDocsSidebarModal(null)}
        onOpenLanguage={() => setDocsSidebarModal("language")}
        onOpenTheme={() => setDocsSidebarModal("theme")}
      />
      <LanguageDialog
        open={docsSidebarModal === "language"}
        onClose={() => setDocsSidebarModal(null)}
      />
      <ThemeDialog
        open={docsSidebarModal === "theme"}
        onClose={() => setDocsSidebarModal(null)}
      />
    </div>
  );
}
