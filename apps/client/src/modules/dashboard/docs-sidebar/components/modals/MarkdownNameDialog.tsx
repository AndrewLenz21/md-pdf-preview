import { NotebookPen } from "lucide-react";
import { useTranslations } from "next-intl";

import { ModalShell } from "@/shared/components/ModalShell";
import { DialogFormFooter } from "@/shared/components/DialogFormFooter";
import { DialogTextField } from "@/shared/components/DialogTextField";

const MAX_DOCUMENT_NAME_LENGTH = 500;
const LONG_PASTED_TITLE_THRESHOLD = 200;

export function MarkdownNameDialog({
  open,
  parentName,
  name,
  source,
  submitting = false,
  onNameChange,
  onLongPaste,
  onClose,
  onSubmit,
}: {
  open: boolean;
  parentName: string;
  name: string;
  source: "local" | "cloud";
  submitting?: boolean;
  onNameChange: (name: string) => void;
  onLongPaste: (text: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const t = useTranslations("Dashboard.newNote");

  return (
    <ModalShell
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title={
        <span className="flex items-center gap-2">
          <NotebookPen
            className="h-5 w-5 text-muted-foreground"
            strokeWidth={1.7}
          />
          {t("title")}
        </span>
      }
      description={t("description", { parentName })}
      closeLabel={t("closeDialog")}
      closeOnEscape={!submitting}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <DialogTextField
          label={t("fileName")}
          value={name}
          maxLength={MAX_DOCUMENT_NAME_LENGTH}
          disabled={submitting}
          labelTrailing={
            source === "cloud" ? (
              <span className="font-normal tabular-nums text-muted-foreground">
                {name.length} / {MAX_DOCUMENT_NAME_LENGTH}
              </span>
            ) : undefined
          }
          onChange={onNameChange}
          onPasteText={(text) => {
            if (text.length <= LONG_PASTED_TITLE_THRESHOLD) {
              return false;
            }

            onLongPaste(text);
            return true;
          }}
          placeholder={t("placeholder")}
          autoFocus
        />
        <DialogFormFooter
          submitLabel={submitting ? t("creating") : t("create")}
          disabled={!name.trim()}
          busy={submitting}
          cancelLabel={t("cancel")}
          onCancel={onClose}
        />
      </form>
    </ModalShell>
  );
}
