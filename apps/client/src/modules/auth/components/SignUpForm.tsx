"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

import { Link, useRouter } from "@/core/i18n";

import { signIn } from "../services/signIn";
import { signUp } from "../services/signUp";

export function SignUpForm() {
  const t = useTranslations("Auth.signUp");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

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

    try {
      const formData = new FormData(form);
      const email = String(formData.get("email") ?? "");
      const password = String(formData.get("password") ?? "");
      const { error: signUpError } = await signUp({
        name: String(formData.get("name") ?? ""),
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message ?? t("error"));
      } else {
        const { error: signInError } = await signIn({ email, password });

        if (signInError) {
          setError(signInError.message ?? t("error"));
          return;
        }

        form.reset();
        setSuccess(true);
        setRedirecting(true);
      }
    } catch (signUpError) {
      setError(signUpError instanceof Error ? signUpError.message : t("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm"
      onSubmit={handleSubmit}
    >
      <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
      <div className="mt-6 space-y-4">
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
        className="mt-6 w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? t("loading") : redirecting ? t("redirecting") : t("submit")}
      </button>
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
