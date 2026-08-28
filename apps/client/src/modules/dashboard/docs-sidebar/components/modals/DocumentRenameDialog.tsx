import { useTranslations } from "next-intl";

import { ModalShell } from "@/shared/components/ModalShell";
import { DialogFormFooter } from "@/shared/components/DialogFormFooter";
import { DialogTextField } from "@/shared/components/DialogTextField";

export function DocumentRenameDialog({
  open,
  displayTitle,
  draftTitle,
  onDraftTitleChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  displayTitle: string;
  draftTitle: string;
  onDraftTitleChange: (title: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const t = useTranslations("Dashboard.renameDocument");

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={t("title")}
      description={t("description", { title: displayTitle })}
      closeLabel={t("closeDialog")}
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
          value={draftTitle}
          maxLength={500}
          onChange={onDraftTitleChange}
          autoFocus
        />
        <DialogFormFooter
          submitLabel={t("save")}
          disabled={!draftTitle.trim()}
          cancelLabel={t("cancel")}
          onCancel={onClose}
        />
      </form>
    </ModalShell>
  );
}
