"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  signInWithSocial,
  type SocialProvider,
} from "../services/signIn";

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function SocialAuthButtons() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [loadingProvider, setLoadingProvider] =
    useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const message = (
    key:
      | "google"
      | "github"
      | "continueWithGoogle"
      | "continueWithGithub"
      | "error"
      | "orEmail",
    fallback: string,
  ) => {
    const path = `social.${key}`;

    return t.has(path) ? t(path) : fallback;
  };
  const googleName = message("google", "Google");
  const githubName = message("github", "GitHub");
  const googleLabel = message("continueWithGoogle", "Continue with Google");
  const githubLabel = message("continueWithGithub", "Continue with GitHub");
  const errorLabel = message(
    "error",
    "Unable to continue with this provider.",
  );
  const orEmailLabel = message("orEmail", "or continue with email");

  const handleSignIn = async (provider: SocialProvider) => {
    setLoadingProvider(provider);
    setError(null);

    try {
      const { error: signInError } = await signInWithSocial({
        provider,
        callbackURL: `/${locale}/dashboard`,
      });

      if (signInError) {
        setError(signInError.message ?? errorLabel);
        setLoadingProvider(null);
      }
    } catch (signInError) {
      setError(
        signInError instanceof Error ? signInError.message : errorLabel,
      );
      setLoadingProvider(null);
    }
  };

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => void handleSignIn("google")}
          disabled={loadingProvider !== null}
          aria-busy={loadingProvider === "google"}
          aria-label={googleLabel}
          title={googleLabel}
          className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-[10px] border border-border/80 bg-background/70 px-2.5 text-sm font-medium text-foreground transition-colors hover:border-border hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleIcon />
          <span className="truncate">{googleName}</span>
        </button>
        <button
          type="button"
          onClick={() => void handleSignIn("github")}
          disabled={loadingProvider !== null}
          aria-busy={loadingProvider === "github"}
          aria-label={githubLabel}
          title={githubLabel}
          className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-[10px] border border-border/80 bg-background/70 px-2.5 text-sm font-medium text-foreground transition-colors hover:border-border hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GithubIcon />
          <span className="truncate">{githubName}</span>
        </button>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="relative my-5 flex items-center">
        <div className="h-px flex-1 bg-border" />
        <span className="px-4 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {orEmailLabel}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
