"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronRight } from "lucide-react";
import { DocsSidebar } from "@/modules/dashboard/docs-sidebar";
import { authClient } from "@/lib/auth-client";
import {
  DashboardBottomNav,
  type MobileDashboardSection,
} from "@/modules/dashboard/mobile-navigation";
import {
  useDocumentEditorStore,
  isWorkspaceDocument,
  useCloudWorkspaceStore,
  useLocalWorkspaceStore,
  useWorkspaceSessionStore,
  useWorkspaceStore,
} from "@/modules/dashboard/stores";
import {
  DocumentPreview,
  PreviewPaneToolbar,
  PreviewToolbar,
  PreviewZoomControl,
} from "@/modules/dashboard/preview";
import {
  isSaveShortcut,
  type EditingActions,
} from "@/modules/dashboard/preview/utils/editingActions";
import type { WorkspaceDocumentItem } from "@/modules/dashboard/document/model/document.types";
import type { DocumentEditorMode } from "@/modules/dashboard/types/editor.types";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import {
  PreferencesDialogHost,
  usePreferencesDialog,
} from "@/shared/preferences";
import { attachDocumentPageBreakMarkers } from "../utils/documentPageBreakMarkers";
import { attachDocumentScrollSync } from "../utils/documentScrollSync";

const DESKTOP_SIDEBAR_DEFAULT_WIDTH = 270;
const DESKTOP_SIDEBAR_MIN_WIDTH = 220;
const DESKTOP_SIDEBAR_MAX_WIDTH = 600;
const DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY =
  "md-pdf-preview:desktop-sidebar-collapsed";

function EmptyDocumentState() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center px-6 text-center">
      <div className="flex max-w-sm flex-col items-center">
        <span
          aria-hidden="true"
          className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-border/70 bg-accent/50 text-3xl shadow-sm"
        >
          📝
        </span>
        <p className="text-base font-semibold text-foreground">
          Select or create a file to start
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Choose a file from your workspace or create a new one to begin.
        </p>
      </div>
    </div>
  );
}

function readDesktopSidebarCollapsed() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(
      DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY,
    ) === "true";
  } catch {
    return false;
  }
}

function writeDesktopSidebarCollapsed(collapsed: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      DESKTOP_SIDEBAR_COLLAPSED_STORAGE_KEY,
      String(collapsed),
    );
  } catch {
    // Sidebar state remains available for the current session.
  }
}

export function DashboardWorkspace() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const activeSource = useWorkspaceSessionStore((state) => state.activeSource);
  const localItems = useLocalWorkspaceStore((state) => state.items);
  const cloudItems = useCloudWorkspaceStore((state) => state.items);
  const hydrateCloudWorkspace = useCloudWorkspaceStore(
    (state) => state.hydrate,
  );
  const cloudIsHydrated = useCloudWorkspaceStore((state) => state.isHydrated);
  const cloudUserId = useCloudWorkspaceStore((state) => state.userId);
  const cloudIsHydrating = useCloudWorkspaceStore(
    (state) => state.isHydrating,
  );
  const cloudError = useCloudWorkspaceStore((state) => state.error);
  const resetCloudWorkspace = useCloudWorkspaceStore((state) => state.reset);
  const hydrateLocalWorkspace = useLocalWorkspaceStore(
    (state) => state.hydrate,
  );
  const items = activeSource === "local" ? localItems : cloudItems;
  const documents = items.filter(
    (item): item is WorkspaceDocumentItem =>
      isWorkspaceDocument(item) && !item.deleted_at,
  );
  const selectedDocumentId = useWorkspaceSessionStore(
    (state) => state.selectedDocumentId,
  );
  const selectedDocumentSource = useWorkspaceSessionStore(
    (state) => state.selectedDocumentSource,
  );
  const selectDocumentInStore = useWorkspaceSessionStore(
    (state) => state.selectDocument,
  );
  const clearSelectionInStore = useWorkspaceSessionStore(
    (state) => state.clearSelection,
  );
  const setActiveSourceInStore = useWorkspaceSessionStore(
    (state) => state.setActiveSource,
  );
  const scheduleLocalContentUpdate = useLocalWorkspaceStore(
    (state) => state.scheduleContentUpdate,
  );
  const scheduleCloudContentUpdate = useCloudWorkspaceStore(
    (state) => state.scheduleContentUpdate,
  );
  const flushLocalPendingContent = useLocalWorkspaceStore(
    (state) => state.flushPendingContent,
  );
  const flushCloudPendingContent = useCloudWorkspaceStore(
    (state) => state.flushPendingContent,
  );
  const selectedSource = selectedDocumentSource ?? activeSource;
  const scheduleContentUpdate =
    selectedSource === "local"
      ? scheduleLocalContentUpdate
      : scheduleCloudContentUpdate;
  const flushPendingContent =
    selectedSource === "local"
      ? flushLocalPendingContent
      : flushCloudPendingContent;
  const initializeWorkspaceZoom = useWorkspaceStore(
    (state) => state.initializeViewportZoom,
  );
  const initializeDocumentEditorZoom = useDocumentEditorStore(
    (state) => state.initializeViewportZoom,
  );
  const [mobileSection, setMobileSection] =
    useState<MobileDashboardSection>("files");
  const { activeDialog, openDialog, closeDialog } = usePreferencesDialog();
  const isDesktopViewport = useMediaQuery("(min-width: 1024px)");
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
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const hasLoadedSidebarPreferenceRef = useRef(false);
  const shouldFocusSidebarToggleRef = useRef(false);
  const desktopSidebarToggleRef = useRef<HTMLButtonElement | null>(null);
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
  const isMobilePaperPreview =
    mobileSection === "preview" && editorMode === "preview";
  const selectedDocumentItems =
    selectedSource === "local" ? localItems : cloudItems;
  const selectedDocuments = selectedDocumentItems.filter(
    (item): item is WorkspaceDocumentItem =>
      isWorkspaceDocument(item) && !item.deleted_at,
  );
  const selectedDocument = selectedDocumentId
    ? selectedDocuments.find((document) => document.id === selectedDocumentId)
    : undefined;
  const selectedDocumentIdForSidebar =
    selectedDocumentSource === activeSource ? selectedDocumentId : null;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDesktopSidebarCollapsed(readDesktopSidebarCollapsed());
      hasLoadedSidebarPreferenceRef.current = true;
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!hasLoadedSidebarPreferenceRef.current) {
      return;
    }

    writeDesktopSidebarCollapsed(desktopSidebarCollapsed);
  }, [desktopSidebarCollapsed]);

  useEffect(() => {
    if (!desktopSidebarCollapsed || !shouldFocusSidebarToggleRef.current) {
      return;
    }

    shouldFocusSidebarToggleRef.current = false;
    desktopSidebarToggleRef.current?.focus();
  }, [desktopSidebarCollapsed]);

  useEffect(() => {
    if (sessionPending) {
      return;
    }

    setActiveSourceInStore(session?.user ? "cloud" : "local");
  }, [session?.user, sessionPending, setActiveSourceInStore]);

  useEffect(() => {
    void hydrateLocalWorkspace();
  }, [hydrateLocalWorkspace]);

  useEffect(() => {
    if (sessionPending) {
      return;
    }

    if (!session?.user) {
      if (cloudUserId !== null || cloudIsHydrated || cloudItems.length > 0) {
        resetCloudWorkspace();
      }
      return;
    }

    if (cloudUserId !== session.user.id) {
      resetCloudWorkspace();
      void hydrateCloudWorkspace(session.user.id);
      return;
    }

    if (!cloudIsHydrated && !cloudIsHydrating && !cloudError) {
      void hydrateCloudWorkspace(session.user.id);
    }
  }, [
    cloudError,
    cloudIsHydrated,
    cloudIsHydrating,
    cloudItems.length,
    cloudUserId,
    hydrateCloudWorkspace,
    resetCloudWorkspace,
    session?.user,
    sessionPending,
  ]);

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
    if (!isPreviewMode || !selectedDocumentId) {
      return;
    }

    return attachDocumentScrollSync(
      desktopDocumentScrollRef.current,
      desktopPreviewScrollRef.current,
    );
  }, [desktopPreviewVisible, isPreviewMode, mobileSection, selectedDocumentId]);

  useEffect(() => {
    if (pageBreakMarkerDocumentIdRef.current === selectedDocument?.id) {
      return;
    }

    pageBreakMarkerDocumentIdRef.current = selectedDocument?.id ?? null;
    setDocumentPageBreakMarkers([]);
    setMobilePageBreakMarkers([]);
  }, [selectedDocument?.id]);

  useEffect(() => {
    if (!desktopPreviewVisible || !selectedDocumentId) {
      return;
    }

    return attachDocumentPageBreakMarkers(
      desktopDocumentScrollRef.current,
      desktopPreviewScrollRef.current,
      setDocumentPageBreakMarkers,
    );
  }, [desktopPreviewVisible, isPreviewMode, mobileSection, selectedDocumentId]);

  useEffect(() => {
    if (
      mobileSection !== "preview" ||
      editorMode !== "document" ||
      !selectedDocumentId
    ) {
      return;
    }

    return attachDocumentPageBreakMarkers(
      mobileDocumentScrollRef.current,
      mobilePageBreakPreviewRef.current,
      setMobilePageBreakMarkers,
    );
  }, [editorMode, mobileSection, selectedDocumentId]);

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if (!isSaveShortcut(event) || !selectedDocumentId) {
        return;
      }

      event.preventDefault();

      if (selectedSource === "cloud") {
        void useCloudWorkspaceStore
          .getState()
          .flushPendingContentAndSave(selectedDocumentId)
          .catch(() => undefined);
        return;
      }

      useLocalWorkspaceStore
        .getState()
        .flushPendingContent(selectedDocumentId);
    };

    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, [selectedDocumentId, selectedSource]);

  const changeEditorMode = (nextMode: DocumentEditorMode) => {
    if (nextMode === editorMode || !selectedDocument) {
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
    if (selectedDocumentId && selectedDocumentId !== id) {
      flushPendingContent(selectedDocumentId);
    }

    saveMobileSectionScroll(mobileSection);
    selectDocumentInStore(id, activeSource);
    setMobileTransitionDirection("forward");
    setMobileSection("preview");
  };

  const handleDocumentDeleted = (id: string) => {
    if (selectedDocument?.id !== id) {
      return;
    }

    const nextDocument = documents.find(
      (document) => document.id !== id && !document.deleted_at,
    );

    if (nextDocument) {
      selectDocument(nextDocument.id);
    } else {
      clearSelectionInStore();
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
  const collapseDesktopSidebar = () => {
    shouldFocusSidebarToggleRef.current = true;
    setDesktopSidebarCollapsed(true);
  };
  const expandDesktopSidebar = () => setDesktopSidebarCollapsed(false);

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
      className={`dashboard-workspace min-h-screen bg-muted/30 text-foreground lg:flex lg:h-screen lg:overflow-hidden ${isMobileFilesSection ? "overflow-hidden" : "overflow-visible"}`}
    >
      {isDesktopViewport ? (
        <>
          <aside
            aria-hidden={desktopSidebarCollapsed || undefined}
            inert={desktopSidebarCollapsed || undefined}
            style={{ width: desktopSidebarCollapsed ? 0 : desktopSidebarWidth }}
            className={`h-screen min-w-0 shrink-0 overflow-hidden bg-sidebar transition-[width,opacity] duration-300 ease-out ${desktopSidebarCollapsed ? "pointer-events-none opacity-0" : "opacity-100"}`}
          >
            <DocsSidebar
              selectedId={selectedDocumentIdForSidebar}
              onSelect={selectDocument}
              onDelete={handleDocumentDeleted}
              onOpenSettings={openDocsSidebarSettings}
              onCollapse={collapseDesktopSidebar}
            />
          </aside>
          <div
            role="separator"
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            aria-valuemin={DESKTOP_SIDEBAR_MIN_WIDTH}
            aria-valuemax={DESKTOP_SIDEBAR_MAX_WIDTH}
            aria-valuenow={Math.round(desktopSidebarWidth)}
            tabIndex={desktopSidebarCollapsed ? -1 : 0}
            className={`group relative flex shrink-0 cursor-col-resize touch-none items-center justify-center border-r border-border/80 bg-background/30 transition-[width,opacity,background-color] duration-300 hover:bg-primary/10 focus-visible:bg-primary/10 ${desktopSidebarCollapsed ? "pointer-events-none w-0 opacity-0" : "w-2 opacity-100"}`}
            onPointerDown={startSidebarResize}
            onKeyDown={resizeSidebarWithKeyboard}
          >
            <span className="pointer-events-none h-10 w-0.5 rounded-full bg-border/70 transition-colors group-hover:bg-primary group-focus-visible:bg-primary" />
          </div>
        </>
      ) : null}

      <main
        className={`relative min-w-0 flex-1 lg:flex lg:h-screen lg:min-h-0 lg:flex-col lg:overflow-hidden ${!selectedDocument ? "h-[calc(100dvh-var(--mobile-dashboard-nav-height))] overflow-hidden pb-0" : isMobileFilesSection ? "h-[calc(100dvh-var(--mobile-dashboard-nav-height))] overflow-hidden pb-0" : isMobilePaperPreview ? "h-[calc(100dvh-var(--mobile-dashboard-nav-height))] overflow-hidden pb-0" : isPreviewMode ? "pb-0" : "pb-20"} lg:pb-0`}
      >
        <div
          className="relative hidden h-full min-h-0 flex-col lg:flex"
        >
          {desktopSidebarCollapsed ? (
            <button
              type="button"
              ref={desktopSidebarToggleRef}
              aria-label="Open sidebar"
              title="Open sidebar"
              className={`absolute left-3 z-30 flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-background/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${selectedDocument ? "top-[4.5rem]" : "top-3"}`}
              onClick={expandDesktopSidebar}
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.7} />
            </button>
          ) : null}
          {selectedDocument ? (
            <>
              <PreviewToolbar
                document={selectedDocument}
                mode={editorMode}
                onModeChange={changeEditorMode}
                editingActions={desktopEditingActions}
                splitMode={isPreviewMode}
              />
              <div
                className="flex h-0 min-h-0 min-w-0 flex-1 overflow-hidden"
              >
                <section
                  className={`relative h-full min-h-0 min-w-0 transition-[width] duration-300 ease-out ${isDesktopSplit ? (isPreviewMode ? "w-1/2" : "w-full") : "w-full"}`}
                >
                  <DocumentPreview
                    document={selectedDocument}
                    mode={isPreviewMode ? "document" : editorMode}
                    embedded={isDesktopViewport === true}
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
                    <PreviewPaneToolbar
                      editingActions={desktopEditingActions}
                    />
                    <div className="min-h-0 min-w-0 flex-1">
                      <DocumentPreview
                        document={selectedDocument}
                        mode="preview"
                        embedded={isDesktopViewport === true}
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
            </>
          ) : (
            <EmptyDocumentState />
          )}
        </div>
        {isDesktopViewport === false ? (
          <div
            className={`relative min-h-0 lg:hidden ${isMobileFilesSection || !selectedDocument || isMobilePaperPreview ? "h-full overflow-hidden" : ""}`}
          >
            {mobileSection === "files" ? (
              <div
                key={mobileSection}
                className={`dashboard-mobile-section dashboard-mobile-section-${mobileTransitionDirection}`}
              >
                <DocsSidebar
                  selectedId={selectedDocumentIdForSidebar}
                  onSelect={selectDocument}
                  onDelete={handleDocumentDeleted}
                  onOpenSettings={openDocsSidebarSettings}
                  mobile
                />
              </div>
            ) : selectedDocument ? (
              <DocumentPreview
                document={selectedDocument}
                mode={editorMode}
                embedded={isMobilePaperPreview}
                scrollScope="mobile"
                onModeChange={changeEditorMode}
                onMobileClear={() => changeMobileSection("files")}
                onContentChange={(content) =>
                  scheduleContentUpdate(selectedDocument.id, content)
                }
                modeTransitionDirection={modeTransitionDirection}
                pageBreakMarkers={mobilePageBreakMarkers}
                scrollContainerRef={mobileDocumentScrollRef}
              />
            ) : (
              <EmptyDocumentState />
            )}
          </div>
        ) : null}
        {mobileSection === "preview" && selectedDocument ? (
          <div className="lg:hidden">
            <PreviewZoomControl mode={editorMode} isMobile />
          </div>
        ) : null}
      </main>

      {selectedDocument ? (
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
      ) : null}

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
