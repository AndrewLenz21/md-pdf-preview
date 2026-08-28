"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/core/i18n";

import { resetPassword } from "../services/resetPassword";

type FormError = {
  code?: string;
  message?: string;
};

function isKnownErrorCode(error: unknown, code: string) {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as FormError).code === code
  );
}

export function ResetPasswordForm({
  token,
  invalidToken = false,
}: {
  token?: string;
  invalidToken?: boolean;
}) {
  const t = useTranslations("Auth.resetPassword");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    invalidToken || !token ? t("invalidToken") : null,
  );
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!token) {
      setError(t("invalidToken"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await resetPassword({
        newPassword,
        token,
      });

      if (resetError) {
        if (isKnownErrorCode(resetError, "INVALID_TOKEN")) {
          setError(t("invalidToken"));
        } else if (isKnownErrorCode(resetError, "PASSWORD_TOO_SHORT")) {
          setError(t("passwordTooShort"));
        } else if (isKnownErrorCode(resetError, "PASSWORD_TOO_LONG")) {
          setError(t("passwordTooLong"));
        } else {
          setError(t("error"));
        }
        return;
      }

      form.reset();
      setSuccess(true);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold leading-tight text-foreground">
          {t("successTitle")}
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {t("successDescription")}
        </p>
        <Link
          href="/auth/sign-in"
          className="mt-6 block w-full rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("signIn")}
        </Link>
      </div>
    );
  }

  return (
    <form
      className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm"
      onSubmit={handleSubmit}
    >
      <h1 className="text-xl font-semibold leading-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {t("description")}
      </p>
      <div className="mt-6 space-y-4">
        <label
          className="block text-sm font-medium text-foreground"
          htmlFor="newPassword"
        >
          {t("newPassword")}
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            disabled={loading}
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <label
          className="block text-sm font-medium text-foreground"
          htmlFor="confirmPassword"
        >
          {t("confirmPassword")}
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            disabled={loading}
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </div>
      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading || invalidToken || !token}
        className="mt-6 w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? t("loading") : t("submit")}
      </button>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link
          href="/auth/sign-in"
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
        >
          {t("signIn")}
        </Link>
      </p>
      {!token || invalidToken ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          <Link
            href="/auth/forgot-password"
            className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
          >
            {t("requestNewLink")}
          </Link>
        </p>
      ) : null}
    </form>
  );
}
