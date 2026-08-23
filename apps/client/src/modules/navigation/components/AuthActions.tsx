"use client";

import { useTranslations } from "next-intl";
import { Settings2, UserRound } from "lucide-react";

import { Link, usePathname } from "@/core/i18n";
import { authClient } from "@/lib/auth-client";

import { LanguageSelector } from "./LanguageSelector";
import { SettingsMenu } from "./SettingsMenu";
import { ThemeMenu } from "./ThemeMenu";

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "U";
}

function SignOutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M10 5H6.75A1.75 1.75 0 0 0 5 6.75v10.5A1.75 1.75 0 0 0 6.75 19H10M14 8l4 4-4 4m4-4H9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AuthActions({
  mobile = false,
  onClose,
  onOpenSettings,
  settingsMode = mobile ? "dialog" : "menu",
}: {
  mobile?: boolean;
  onClose?: () => void;
  onOpenSettings?: () => void;
  settingsMode?: "dialog" | "menu";
}) {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { data, isPending } = authClient.useSession();
  const user = data?.user;
  const displayName = user?.name || user?.email || "User";
  const signOutLabel = t.has("actions.signOut")
    ? t("actions.signOut")
    : "Sign out";
  const settingsLabel = t.has("settings.open")
    ? t("settings.open")
    : "Open settings";
  const guestLabel = t.has("guest") ? t("guest") : "Guest";
  const mobileProfileSurface =
    settingsMode === "menu" ? "bg-sidebar-accent" : "bg-card/60";

  if (isPending) {
    return (
      <div
        className={
          mobile
            ? `h-[74px] rounded-lg border border-border ${mobileProfileSurface}`
            : "h-9 w-52 rounded-md bg-muted/60"
        }
        aria-hidden="true"
      />
    );
  }

  if (!user) {
    if (mobile) {
      if (isLanding) {
        return (
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/auth/sign-in"
              onClick={onClose}
              className="flex items-center justify-center rounded-lg border border-border px-3 py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-accent/60"
            >
              {t("actions.signIn")}
            </Link>
            <Link
              href="/auth/sign-up"
              onClick={onClose}
              className="flex items-center justify-center rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("actions.signUp")}
            </Link>
          </div>
        );
      }

      return (
        <div
          className={`flex items-center justify-between rounded-lg border border-border p-3 ${mobileProfileSurface}`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
            >
              <UserRound className="h-4 w-4" strokeWidth={1.7} />
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {guestLabel}
            </span>
          </div>
          {settingsMode === "menu" ? (
            <SettingsMenu placement="sidebar" />
          ) : (
            <button
              type="button"
              aria-label={settingsLabel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                onOpenSettings?.();
              }}
            >
              <Settings2 className="h-4 w-4" strokeWidth={1.7} />
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeMenu />
        <LanguageSelector />
        <div className="grid w-52 grid-cols-2 items-stretch gap-2">
          <Link
            href="/auth/sign-in"
            onClick={onClose}
            className="flex min-h-9 items-center justify-center rounded-md px-2.5 py-1.5 text-center text-sm font-medium leading-4 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            {t("actions.signIn")}
          </Link>
          <Link
            href="/auth/sign-up"
            onClick={onClose}
            className="flex min-h-9 items-center justify-center rounded-md bg-primary px-2.5 py-1.5 text-center text-sm font-semibold leading-4 text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("actions.signUp")}
          </Link>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    onClose?.();
  };

  if (mobile) {
    return (
      <div
        className={`space-y-3 rounded-lg border border-border p-3 ${mobileProfileSurface}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {getInitial(displayName)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">
                {displayName}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </span>
          </div>
          {settingsMode === "menu" ? (
            <SettingsMenu
              placement="sidebar"
              onSignOut={handleSignOut}
              signOutLabel={signOutLabel}
            />
          ) : (
            <button
              type="button"
              aria-label={settingsLabel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                onOpenSettings?.();
              }}
            >
              <Settings2 className="h-4 w-4" strokeWidth={1.7} />
            </button>
          )}
        </div>
        {settingsMode === "dialog" ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/60"
          >
            <SignOutIcon />
            {signOutLabel}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {getInitial(displayName)}
        </span>
        <span className="max-w-28 truncate text-sm font-medium text-foreground">
          {displayName}
        </span>
      </div>
      <SettingsMenu />
      <button
        type="button"
        onClick={handleSignOut}
        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-destructive"
      >
        <SignOutIcon />
        {signOutLabel}
      </button>
    </div>
  );
}
