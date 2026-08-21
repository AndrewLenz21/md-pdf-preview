import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

export function DeleteFolderDialog({
  open,
  folderName,
  onClose,
  onConfirm,
}: {
  open: boolean;
  folderName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <DeleteConfirmationDialog
      open={open}
      itemName={folderName}
      itemType="folder"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
