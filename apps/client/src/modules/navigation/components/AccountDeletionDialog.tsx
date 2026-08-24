"use client";

import { AlertTriangle, LoaderCircle, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { ModalShell } from "@/shared/components/ModalShell";

export function AccountDeletionDialog({
  open,
  onClose,
  onConfirm,
  isDeleting,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  error: string | null;
}) {
  const t = useTranslations("Navigation.accountDeletion");
  const close = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={close}
      closeOnEscape={!isDeleting}
      title={t("title")}
      description={t("description")}
      closeLabel={t("cancel")}
      contentClassName="border-destructive/30"
    >
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex gap-3">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {t("deletedTitle")}
            </p>
            <ul className="mt-2 space-y-2 text-sm leading-5 text-foreground/90">
              {["deletedAccount", "deletedWorkspace", "deletedAuth"].map(
                (key) => (
                  <li key={key} className="flex gap-2">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive"
                      aria-hidden="true"
                    />
                    <span>{t(key)}</span>
                  </li>
                ),
              )}
            </ul>
            <div className="mt-4 border-t border-destructive/20 pt-3">
              <p className="text-sm font-semibold text-foreground">
                {t("keptTitle")}
              </p>
              <ul className="mt-2 space-y-2 text-sm leading-5 text-foreground/80">
                {["keptLocal", "keptLogs"].map((key) => (
                  <li key={key} className="flex gap-2">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground"
                      aria-hidden="true"
                    />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={isDeleting}
          onClick={close}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-background/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          disabled={isDeleting}
          onClick={onConfirm}
          aria-busy={isDeleting}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          )}
          {isDeleting ? t("deleting") : t("confirm")}
        </button>
      </div>
    </ModalShell>
  );
}
