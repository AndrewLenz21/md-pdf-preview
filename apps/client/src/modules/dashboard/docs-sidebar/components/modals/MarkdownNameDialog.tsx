import { ModalShell } from "@/shared/components/ModalShell";
import { DialogFormFooter } from "@/shared/components/DialogFormFooter";
import { DialogTextField } from "@/shared/components/DialogTextField";

export function MarkdownNameDialog({
  open,
  parentName,
  name,
  submitting = false,
  onNameChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  parentName: string;
  name: string;
  submitting?: boolean;
  onNameChange: (name: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title="New markdown"
      description={`Create a markdown file in ${parentName}.`}
      closeLabel="Close markdown dialog"
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
          label="File name"
          value={name}
          maxLength={500}
          disabled={submitting}
          onChange={onNameChange}
          placeholder="Untitled"
          autoFocus
        />
        <DialogFormFooter
          submitLabel={submitting ? "Creating..." : "Create file"}
          disabled={!name.trim()}
          busy={submitting}
          onCancel={onClose}
        />
      </form>
    </ModalShell>
  );
}
