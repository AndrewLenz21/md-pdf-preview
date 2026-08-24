"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check } from "lucide-react";

import { Link, useRouter } from "@/core/i18n";

import { sendVerificationEmail } from "../services/sendVerificationEmail";
import { signIn } from "../services/signIn";
import { SocialAuthButtons } from "./SocialAuthButtons";

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

export function SignInForm() {
  const t = useTranslations("Auth.signIn");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [lastEmail, setLastEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (!redirecting) return;

    const timeout = window.setTimeout(() => {
      router.replace("/dashboard");
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [redirecting, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(true);
    setError(null);
    setSuccess(false);
    setRedirecting(false);
    setEmailNotVerified(false);
    setResendSent(false);
    setResendError(null);

    try {
      const formData = new FormData(form);
      const email = String(formData.get("email") ?? "");
      const { error: signInError } = await signIn({
        email,
        password: String(formData.get("password") ?? ""),
      });

      if (signInError) {
        if (isKnownErrorCode(signInError, "USER_NOT_FOUND")) {
          setError(t("userNotFound"));
        } else if (isKnownErrorCode(signInError, "EMAIL_NOT_VERIFIED")) {
          setLastEmail(email);
          setEmailNotVerified(true);
          setError(t("emailNotVerified"));
        } else {
          setError(signInError.message ?? t("error"));
        }
      } else {
        form.reset();
        setSuccess(true);
        setRedirecting(true);
      }
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!lastEmail) {
      return;
    }

    setResending(true);
    setResendSent(false);
    setResendError(null);

    try {
      const { error: resendError } = await sendVerificationEmail({
        email: lastEmail,
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
      }
    } catch (resendError) {
      setResendError(
        resendError instanceof Error ? resendError.message : t("error"),
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <form
      className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm"
      onSubmit={handleSubmit}
    >
      <h1 className="auth-page-title text-xl font-semibold leading-tight text-foreground">
        {t("title")}
      </h1>
      <SocialAuthButtons />
      <div className="mt-6 space-y-4">
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
            autoComplete="current-password"
            required
            disabled={loading}
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </div>
      {emailNotVerified ? (
        <>
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resending ? t("resendLoading") : t("resendVerification")}
            </button>
            {resendSent ? (
              <p
                className="flex items-center gap-2 text-sm text-primary"
                role="status"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                </span>
                {t("resendSent")}
              </p>
            ) : null}
            {resendError ? (
              <p className="text-sm text-destructive" role="alert">
                {resendError}
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <div className="h-5 text-sm leading-5" aria-live="polite">
          {error ? (
            <p className="text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}
      {success ? (
        <p
          className="mt-4 flex items-center gap-2 text-sm text-primary animate-pulse"
          role="status"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
            <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
          {t("success")} {t("redirecting")}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading || redirecting}
        className={`${emailNotVerified || success ? "mt-6" : "mt-1"} w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? t("loading") : redirecting ? t("redirecting") : t("submit")}
      </button>
      <div className="flex flex-col">
        <p className="order-2 mt-4 text-center text-xs leading-5 text-muted-foreground">
        {t("legalPrefix")}{" "}
        <Link
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          {t("terms")}
        </Link>{" "}
        {t("legalAnd")}{" "}
        <Link
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          {t("privacy")}
        </Link>
        .
        </p>
        <p className="order-1 mt-5 text-center text-sm text-muted-foreground">
        {t("newAccount")}{" "}
        <Link
          href="/auth/sign-up"
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
        >
          {t("newAccountLink")}
        </Link>
        </p>
      </div>
    </form>
  );
}
