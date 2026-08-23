"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, MailCheck } from "lucide-react";

import { Link } from "@/core/i18n";

import { sendVerificationEmail } from "../services/sendVerificationEmail";
import { signUp } from "../services/signUp";
import { SocialAuthButtons } from "./SocialAuthButtons";

const RESEND_COOLDOWN_SECONDS = 100;

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

export function SignUpForm() {
  const t = useTranslations("Auth.signUp");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timeout = window.setTimeout(() => {
      setResendCountdown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [resendCountdown]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(form);
      const email = String(formData.get("email") ?? "");
      const { error: signUpError } = await signUp({
        name: String(formData.get("name") ?? ""),
        email,
        password: String(formData.get("password") ?? ""),
        locale,
      });

      if (signUpError) {
        if (isKnownErrorCode(signUpError, "DAILY_REGISTRATION_LIMIT_REACHED")) {
          setError(t("dailyLimit"));
        } else if (
          isKnownErrorCode(signUpError, "VERIFICATION_EMAIL_SEND_FAILED")
        ) {
          setError(t("sendFailed"));
        } else {
          setError(signUpError.message ?? t("error"));
        }
      } else {
        form.reset();
        setRegisteredEmail(email);
        setResendCountdown(RESEND_COOLDOWN_SECONDS);
      }
    } catch (signUpError) {
      setError(signUpError instanceof Error ? signUpError.message : t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) {
      return;
    }

    setResending(true);
    setResendSent(false);
    setResendError(null);

    try {
      const { error: resendError } = await sendVerificationEmail({
        email: registeredEmail,
        locale,
      });

      if (resendError) {
        if (isKnownErrorCode(resendError, "DAILY_REGISTRATION_LIMIT_REACHED")) {
          setResendError(t("dailyLimit"));
        } else if (
          isKnownErrorCode(resendError, "VERIFICATION_EMAIL_COOLDOWN")
        ) {
          setResendError(t("cooldown"));
        } else {
          setResendError(resendError.message ?? t("error"));
        }
      } else {
        setResendSent(true);
        setResendCountdown(RESEND_COOLDOWN_SECONDS);
      }
    } catch (resendError) {
      setResendError(
        resendError instanceof Error ? resendError.message : t("error"),
      );
    } finally {
      setResending(false);
    }
  };

  if (registeredEmail) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
            <MailCheck className="h-5 w-5 text-primary" strokeWidth={2} />
          </span>
          <h1 className="text-xl font-semibold text-foreground">
            {t("verificationTitle")}
          </h1>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {t("verificationMessage", { email: registeredEmail })}
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resendCountdown > 0}
          className="mt-6 w-full rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resending
            ? t("resendLoading")
            : resendCountdown > 0
              ? t("resendIn", { seconds: resendCountdown })
              : t("resend")}
        </button>
        {resendSent ? (
          <p
            className="mt-4 flex items-center gap-2 text-sm text-primary"
            role="status"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
              <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
            </span>
            {t("resendSent")}
          </p>
        ) : null}
        {resendError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {resendError}
          </p>
        ) : null}
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t("existingAccount")}{" "}
          <Link
            href="/auth/sign-in"
            className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
          >
            {t("existingAccountLink")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm"
      onSubmit={handleSubmit}
    >
      <h1 className="auth-page-title text-xl font-semibold leading-tight text-foreground">
        {t("title")}
      </h1>
      <SocialAuthButtons />
      <div className="mt-[21px] space-y-4">
        <label
          className="block text-sm font-medium text-foreground"
          htmlFor="name"
        >
          {t("name")}
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            disabled={loading}
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <label
          className="block text-sm font-medium text-foreground"
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
        <label
          className="block text-sm font-medium text-foreground"
          htmlFor="password"
        >
          {t("password")}
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
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
        disabled={loading}
        className="mt-6 w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? t("loading") : t("submit")}
      </button>
      <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
        {t("legalPrefix")}{" "}
        <Link
          href="/terms"
          className="underline underline-offset-4 hover:text-foreground"
        >
          {t("terms")}
        </Link>{" "}
        {t("legalAnd")}{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-4 hover:text-foreground"
        >
          {t("privacy")}
        </Link>
        .
      </p>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t("existingAccount")}{" "}
        <Link
          href="/auth/sign-in"
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
        >
          {t("existingAccountLink")}
        </Link>
      </p>
    </form>
  );
}
