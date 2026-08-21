"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { DocsSidebar } from "@/modules/dashboard/docs-sidebar";
import {
  DashboardBottomNav,
  type MobileDashboardSection,
} from "@/modules/dashboard/mobile-navigation";
import {
  useDocumentEditorStore,
  useDocumentOrganizationStore,
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
import {
  PreferencesDialogHost,
  usePreferencesDialog,
} from "@/shared/preferences";
import { attachDocumentPageBreakMarkers } from "../utils/documentPageBreakMarkers";
import { attachDocumentScrollSync } from "../utils/documentScrollSync";

const DESKTOP_SIDEBAR_DEFAULT_WIDTH = 270;
const DESKTOP_SIDEBAR_MIN_WIDTH = 220;
const DESKTOP_SIDEBAR_MAX_WIDTH = 600;

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
  const { activeDialog, openDialog, closeDialog } = usePreferencesDialog();
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
  const [desktopSidebarWidth, setDesktopSidebarWidth] = useState(
    DESKTOP_SIDEBAR_DEFAULT_WIDTH,
  );
  const [desktopEditingActions, setDesktopEditingActions] =
    useState<EditingActions | null>(null);
  const [documentPageBreakMarkers, setDocumentPageBreakMarkers] = useState<
    number[]
  >([]);
  const [mobilePageBreakMarkers, setMobilePageBreakMarkers] = useState<
    number[]
  >([]);
  const pageBreakMarkerDocumentIdRef = useRef(selectedDocumentId);
  const desktopDocumentScrollRef = useRef<HTMLDivElement | null>(null);
  const desktopPreviewScrollRef = useRef<HTMLDivElement | null>(null);
  const desktopWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const isSidebarResizingRef = useRef(false);
  const mobileDocumentScrollRef = useRef<HTMLDivElement | null>(null);
  const mobilePageBreakPreviewRef = useRef<HTMLDivElement | null>(null);
  const mobileSectionScrollPositions = useRef<
    Record<MobileDashboardSection, number>
  >({ files: 0, preview: 0 });
  const isDesktopSplit = isPreviewMode || desktopPreviewVisible;
  const isMobileFilesSection = mobileSection === "files";
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

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isSidebarResizingRef.current) {
        return;
      }

      const workspace = desktopWorkspaceRef.current;

      if (!workspace) {
        return;
      }

      const workspaceLeft = workspace.getBoundingClientRect().left;
      const nextWidth = Math.min(
        DESKTOP_SIDEBAR_MAX_WIDTH,
        Math.max(DESKTOP_SIDEBAR_MIN_WIDTH, event.clientX - workspaceLeft),
      );

      setDesktopSidebarWidth(nextWidth);
    };

    const handlePointerUp = () => {
      if (!isSidebarResizingRef.current) {
        return;
      }

      isSidebarResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.body.style.touchAction = "";
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
      handlePointerUp();
    };
  }, []);

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
  }, [
    desktopPreviewVisible,
    isPreviewMode,
    mobileSection,
    selectedDocument.id,
  ]);

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

  const handleDocumentDeleted = (id: string) => {
    if (selectedDocument.id !== id) {
      return;
    }

    const localDocumentOrganization =
      useDocumentOrganizationStore.getState().localDocuments;
    const nextDocument = documents.find(
      (document) =>
        document.id !== id && !localDocumentOrganization[document.id]?.deleted,
    );

    if (nextDocument) {
      selectDocument(nextDocument.id);
    }
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

  const openDocsSidebarSettings = () => openDialog("settings");

  const startSidebarResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    isSidebarResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.body.style.touchAction = "none";
  };

  const resizeSidebarWithKeyboard = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;

    setDesktopSidebarWidth((width) =>
      Math.min(
        DESKTOP_SIDEBAR_MAX_WIDTH,
        Math.max(DESKTOP_SIDEBAR_MIN_WIDTH, width + direction * 16),
      ),
    );
  };

  return (
    <div
      ref={desktopWorkspaceRef}
      className={`dashboard-workspace min-h-screen bg-muted/30 text-foreground lg:flex ${isDesktopSplit ? "overflow-x-hidden lg:h-screen lg:overflow-hidden" : isMobileFilesSection ? "overflow-hidden lg:h-auto lg:overflow-visible" : "overflow-visible lg:h-auto"}`}
    >
      <aside
        style={{ width: desktopSidebarWidth }}
        className="hidden h-screen min-w-0 shrink-0 overflow-hidden bg-sidebar lg:sticky lg:top-0 lg:flex"
      >
        <DocsSidebar
          documents={documents}
          selectedId={selectedDocument.id}
          onSelect={selectDocument}
          onDelete={handleDocumentDeleted}
          onOpenSettings={openDocsSidebarSettings}
        />
      </aside>
      <div
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        aria-valuemin={DESKTOP_SIDEBAR_MIN_WIDTH}
        aria-valuemax={DESKTOP_SIDEBAR_MAX_WIDTH}
        aria-valuenow={Math.round(desktopSidebarWidth)}
        tabIndex={0}
        className="group relative hidden w-2 shrink-0 cursor-col-resize touch-none items-center justify-center border-r border-border/80 bg-background/30 transition-colors hover:bg-primary/10 focus-visible:bg-primary/10 lg:flex"
        onPointerDown={startSidebarResize}
        onKeyDown={resizeSidebarWithKeyboard}
      >
        <span className="pointer-events-none h-10 w-0.5 rounded-full bg-border/70 transition-colors group-hover:bg-primary group-focus-visible:bg-primary" />
      </div>

      <main
        className={`min-w-0 flex-1 ${isMobileFilesSection ? "h-[calc(100dvh-var(--mobile-dashboard-nav-height))] overflow-hidden pb-0 lg:h-auto lg:overflow-visible" : "pb-20"} lg:pb-0 ${isDesktopSplit ? "lg:h-screen lg:min-h-0" : "lg:h-auto lg:min-h-screen"}`}
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
            className={
              isDesktopSplit ? "flex h-0 min-h-0 min-w-0 flex-1" : "min-w-0"
            }
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
          className={`relative h-full min-h-0 lg:hidden ${isPreviewMode || isMobileFilesSection ? "overflow-hidden" : ""}`}
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
                onDelete={handleDocumentDeleted}
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

      <PreferencesDialogHost
        activeDialog={activeDialog}
        onChange={(dialog) => (dialog ? openDialog(dialog) : closeDialog())}
      />
    </div>
  );
}
