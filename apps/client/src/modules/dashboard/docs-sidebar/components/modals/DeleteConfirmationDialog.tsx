import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { ModalShell } from "@/shared/components/ModalShell";

export function DeleteConfirmationDialog({
  open,
  itemName,
  itemType,
  onClose,
  onConfirm,
}: {
  open: boolean;
  itemName: string;
  itemType: "file" | "folder";
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("Dashboard.delete");
  const isFolder = itemType === "folder";
  const translatedItemType = t(itemType);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={t("title", { itemType: translatedItemType })}
      description={t(isFolder ? "folderDescription" : "fileDescription", {
        itemName,
      })}
      closeLabel={t("closeDialog", { itemType: translatedItemType })}
      maxWidth="max-w-sm"
    >
      <div className="space-y-5">
        <div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            strokeWidth={1.8}
          />
          <p>{isFolder ? t("folderWarning") : t("fileWarning")}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={onClose}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="rounded-lg bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {t("confirm", { itemType: translatedItemType })}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
