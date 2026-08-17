import { Files, FileText } from "lucide-react";

export type MobileDashboardSection = "files" | "preview";

export function DashboardBottomNav({
  activeSection,
  onChange,
}: {
  activeSection: MobileDashboardSection;
  onChange: (section: MobileDashboardSection) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_-24px_rgba(15,23,42,0.45)] backdrop-blur-md lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange("files")}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-colors ${activeSection === "files" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
          aria-current={activeSection === "files" ? "page" : undefined}
        >
          <Files className="h-4 w-4" strokeWidth={1.7} />
          Files
        </button>
        <button
          type="button"
          onClick={() => onChange("preview")}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-colors ${activeSection === "preview" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
          aria-current={activeSection === "preview" ? "page" : undefined}
        >
          <FileText className="h-4 w-4" strokeWidth={1.7} />
          Preview
        </button>
      </div>
    </nav>
  );
}
