/**
 * Provides the shared neutral action row used by dialog forms. The submit
 * button intentionally uses the native form submit event so each dialog keeps
 * ownership of validation and business logic.
 */
export function DialogFormFooter({
  submitLabel,
  onCancel,
  disabled = false,
  busy = false,
  cancelLabel = "Cancel",
}: {
  submitLabel: string;
  onCancel: () => void;
  disabled?: boolean;
  busy?: boolean;
  cancelLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
      <button
        type="button"
        disabled={busy}
        className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onCancel}
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={disabled || busy}
        className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </div>
  );
}
