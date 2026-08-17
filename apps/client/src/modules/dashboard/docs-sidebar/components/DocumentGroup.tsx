import { FolderOpen } from "lucide-react";

import type {
  DocumentGroup as DocumentGroupType,
  MockDocument,
} from "@/modules/dashboard/document/model/document.types";

import { DocumentItem } from "./DocumentItem";

const GROUP_LABELS: Record<DocumentGroupType, string> = {
  recent: "Recent",
  documents: "Documents",
};

export function DocumentGroup({
  group,
  documents,
  selectedId,
  onSelect,
}: {
  group: DocumentGroupType;
  documents: MockDocument[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
        <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.7} />
        <span>{GROUP_LABELS[group]}</span>
      </div>
      <div className="space-y-0.5">
        {documents.map((document) => (
          <DocumentItem
            key={document.id}
            document={document}
            selected={document.id === selectedId}
            onSelect={() => onSelect(document.id)}
          />
        ))}
      </div>
    </section>
  );
}
