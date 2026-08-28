import { Cloud, HardDrive, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import type { DocumentSource } from "@/modules/dashboard/document/model/document.types";
import { useDocumentDndStore } from "@/modules/dashboard/stores";

export function DocumentSourceToggle({
  source,
  onChange,
  dragging = false,
  cloudBlocked = false,
  disabled = false,
}: {
  source: DocumentSource;
  onChange: (source: DocumentSource) => void;
  dragging?: boolean;
  cloudBlocked?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("Dashboard.storage");
  const isDragging = useDocumentDndStore((state) => state.isDragging);

  return (
    <button
      type="button"
      aria-label={t("toggleLabel")}
      aria-pressed={source === "cloud"}
      disabled={disabled}
      className="relative grid min-h-9 shrink-0 grid-cols-2 gap-0.5 overflow-hidden rounded-lg border border-border/80 bg-background/50 p-0.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      onClick={(event) => {
        if (disabled || dragging || isDragging) {
          event.preventDefault();
          return;
        }

        onChange(source === "local" ? "cloud" : "local");
      }}
    >
      <span
        aria-hidden="true"
        className={`sidebar-source-toggle-indicator pointer-events-none absolute inset-y-0.5 left-0.5 rounded-md bg-accent shadow-sm ${source === "cloud" ? "translate-x-full" : "translate-x-0"}`}
        style={{ width: "calc(50% - 2px)" }}
      />
      <span
        data-dnd-source-target="local"
        title={t("deviceTooltip")}
        className={`relative z-10 flex items-center justify-center gap-1.5 rounded-md px-2 ${source === "local" ? "text-accent-foreground" : "text-muted-foreground"}`}
      >
        <HardDrive className="h-3.5 w-3.5" strokeWidth={1.7} />
        {t("device")}
      </span>
      <span
        data-dnd-source-target="cloud"
        data-dnd-source-blocked={cloudBlocked ? "true" : undefined}
        title={t("cloudTooltip")}
        className={`relative z-10 flex items-center justify-center gap-1.5 rounded-md px-2 ${source === "cloud" ? "text-accent-foreground" : cloudBlocked ? "text-destructive" : "text-muted-foreground"}`}
      >
        {cloudBlocked ? (
          <Lock className="h-3.5 w-3.5" strokeWidth={1.7} />
        ) : (
          <Cloud className="h-3.5 w-3.5" strokeWidth={1.7} />
        )}
        {t("cloud")}
      </span>
    </button>
  );
}
