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
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Rename file"
      description={`Rename ${displayTitle}.`}
      closeLabel="Close rename dialog"
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <DialogTextField
          label="File name"
          value={draftTitle}
          maxLength={500}
          onChange={onDraftTitleChange}
          autoFocus
        />
        <DialogFormFooter
          submitLabel="Save name"
          disabled={!draftTitle.trim()}
          onCancel={onClose}
        />
      </form>
    </ModalShell>
  );
}
