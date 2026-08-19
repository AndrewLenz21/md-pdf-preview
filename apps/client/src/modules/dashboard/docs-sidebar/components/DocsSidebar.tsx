import { FilePlus2, LibraryBig } from "lucide-react";
import { useLocale } from "next-intl";

import { Link } from "@/core/i18n";
import { AuthActions } from "@/modules/navigation/components/AuthActions";
import type { MockDocument } from "@/modules/dashboard/document/model/document.types";

import { DocumentGroup } from "./DocumentGroup";

export function DocsSidebar({
  documents,
  selectedId,
  onSelect,
  onOpenSettings,
  mobile = false,
}: {
  documents: MockDocument[];
  selectedId: string;
  onSelect: (id: string) => void;
  onOpenSettings?: () => void;
  mobile?: boolean;
}) {
  const locale = useLocale();
  const recentDocuments = documents.filter(
    (document) => document.group === "recent",
  );
  const savedDocuments = documents.filter(
    (document) => document.group === "documents",
  );

  return (
    <div
      className={`flex h-full flex-col ${mobile ? "min-h-[calc(100vh-5rem)]" : ""}`}
    >
      <div className="flex items-center justify-between border-b border-border/80 px-5 py-5">
        <Link
          href="/"
          locale={locale}
          aria-label="Back to Markdown Preview landing page"
          className="flex items-center gap-2.5 rounded-md transition-opacity hover:opacity-80"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            M
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Workspace</p>
            <p className="text-[11px] text-muted-foreground">
              Markdown Preview
            </p>
          </div>
        </Link>
        <button
          type="button"
          aria-label="Create new document"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <FilePlus2 className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </div>

      <div className="flex-1 space-y-7 overflow-y-auto px-3 py-5">
        <div className="px-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <LibraryBig className="h-4 w-4 text-primary" strokeWidth={1.7} />
            <span>Files</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Your quiet corner for drafts, notes, and ideas.
          </p>
        </div>
        <DocumentGroup
          group="recent"
          documents={recentDocuments}
          selectedId={selectedId}
          onSelect={onSelect}
        />
        <DocumentGroup
          group="documents"
          documents={savedDocuments}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>

      <div className="border-t border-border/80 p-3">
        <AuthActions
          mobile
          onOpenSettings={onOpenSettings}
          settingsMode={mobile ? "dialog" : "menu"}
        />
      </div>
    </div>
  );
}
