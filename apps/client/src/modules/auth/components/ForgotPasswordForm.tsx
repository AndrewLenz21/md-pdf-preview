"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/core/i18n";

import { requestPasswordReset } from "../services/requestPasswordReset";

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

export function ForgotPasswordForm() {
  const t = useTranslations("Auth.forgotPassword");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");

    setLoading(true);
    setError(null);

    try {
      const redirectTo = new URL(
        `/${locale}/auth/reset-password`,
        window.location.origin,
      ).toString();
      const { error: requestError } = await requestPasswordReset({
        email,
        redirectTo,
        locale,
      });

      if (requestError) {
        if (isKnownErrorCode(requestError, "DAILY_REGISTRATION_LIMIT_REACHED")) {
          setError(t("dailyLimit"));
        } else if (isKnownErrorCode(requestError, "PASSWORD_RESET_COOLDOWN")) {
          setError(t("cooldown"));
        } else {
          setError(t("error"));
        }
        return;
      }

      form.reset();
      setSubmittedEmail(email);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  };

  if (submittedEmail) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold leading-tight text-foreground">
          {t("successTitle")}
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {t("successMessage", { email: submittedEmail })}
        </p>
        <Link
          href="/auth/sign-in"
          className="mt-6 block w-full rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("backToSignIn")}
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
      <label
        className="mt-6 block text-sm font-medium text-foreground"
        htmlFor="email"
      >
        {t("email")}
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={loading}
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>
      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? t("loading") : t("submit")}
      </button>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link
          href="/auth/sign-in"
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
        >
          {t("backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
