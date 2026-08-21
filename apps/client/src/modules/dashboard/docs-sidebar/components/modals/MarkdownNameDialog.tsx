import { ModalShell } from "@/shared/components/ModalShell";
import { DialogFormFooter } from "@/shared/components/DialogFormFooter";
import { DialogTextField } from "@/shared/components/DialogTextField";

export function MarkdownNameDialog({
  open,
  parentName,
  name,
  onNameChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  parentName: string;
  name: string;
  onNameChange: (name: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="New markdown"
      description={`Create a markdown file in ${parentName}.`}
      closeLabel="Close markdown dialog"
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
          onChange={onNameChange}
          placeholder="Untitled"
          autoFocus
        />
        <DialogFormFooter
          submitLabel="Create file"
          disabled={!name.trim()}
          onCancel={onClose}
        />
      </form>
    </ModalShell>
  );
}
