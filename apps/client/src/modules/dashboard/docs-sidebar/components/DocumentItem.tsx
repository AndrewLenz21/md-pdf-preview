import { FileText } from "lucide-react";

import type { MockDocument } from "@/modules/dashboard/document/model/document.types";

export function DocumentItem({
  document,
  selected,
  onSelect,
}: {
  document: MockDocument;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${selected ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
    >
      <FileText
        className={`h-4 w-4 shrink-0 ${selected ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"}`}
        strokeWidth={1.7}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {document.title}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {document.updatedAt}
        </span>
      </span>
    </button>
  );
}
