"use client";

import { useTranslations } from "next-intl";
import {
  Accessibility,
  ArrowDown,
  ArrowRight,
  Cloud,
  Columns2,
  Database,
  FolderOpen,
  Languages,
  LayoutGrid,
  Palette,
  Printer,
  Ruler,
  ScanLine,
  Smartphone,
  Star,
} from "lucide-react";
import type { ComponentType, CSSProperties } from "react";

import { Link } from "@/core/i18n";
import { Logo } from "@/shared/components/Logo";

const GITHUB_URL = "https://github.com/AndrewLenz21/md-pdf-preview";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}

const FEATURE_ICONS: Record<
  string,
  ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  fidelity: ScanLine,
  modes: Columns2,
  paperSizes: Ruler,
  printReady: Printer,
  pagination: LayoutGrid,
  workspaces: FolderOpen,
  localFirst: Database,
  cloudSync: Cloud,
  i18n: Languages,
  themes: Palette,
  responsive: Smartphone,
  accessibility: Accessibility,
};

const FEATURE_KEYS = Object.keys(FEATURE_ICONS);

const TOUR_STEPS = [
  {
    key: "create",
    image: "/presentation/1-new-file-md-preview.gif",
    wide: true,
  },
  {
    key: "organize",
    image: "/presentation/1-moving-files-folders.gif",
    wide: true,
  },
  {
    key: "cloud",
    image: "/presentation/1-moving-folder-cloud.gif",
    wide: true,
  },
  {
    key: "desktop",
    image: "/presentation/Dashboard-desktop.png",
    wide: true,
  },
  {
    key: "mobile",
    image: "/presentation/Dashboard-mobile-version.png",
    wide: false,
  },
  {
    key: "pageBreak",
    image: "/presentation/Possible-page-break.png",
    wide: true,
  },
] as const;

const PAPER_SIZES = [
  { label: "A4", ratio: "210 / 297", widthClass: "w-44" },
  { label: "A5", ratio: "148 / 210", widthClass: "w-32" },
  { label: "Letter", ratio: "17 / 22", widthClass: "w-40" },
  { label: "Legal", ratio: "17 / 28", widthClass: "w-40" },
] as const;

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function MediaFrame({
  src,
  alt,
  wide,
}: {
  src: string;
  alt: string;
  wide: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border bg-card shadow-xl ${wide ? "" : "max-w-xs"}`}
    >
      <div className="flex items-center gap-1.5 border-b border-border/70 bg-muted/50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
      </div>
      {/* Static public screenshots and animated GIFs; next/image cannot optimize GIFs. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="w-full" />
    </div>
  );
}

export function LandingPage() {
  const t = useTranslations("Landing");
  const footerLabel = (
    key: "terms" | "privacy" | "cookies",
    fallback: string,
  ) => (t.has(`footer.${key}`) ? t(`footer.${key}`) : fallback);

  return (
    <main className="overflow-x-clip">
      <section
        id="product"
        className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-24"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 flex justify-center"
        >
          <div
            className="h-[480px] w-[880px] max-w-none opacity-25 blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, var(--source-doc), transparent)",
            }}
          />
        </div>

        <div className="mx-auto max-w-3xl text-center">
          <div
            className="landing-reveal mb-6 flex items-center justify-center gap-2.5"
            style={{ "--landing-delay": "0ms" } as CSSProperties}
          >
            <span
              aria-hidden="true"
              className="hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-card shadow-sm sm:flex"
            >
              <Logo className="h-7 w-7" />
            </span>
            <span className="landing-typewriter text-lg font-semibold tracking-[-0.01em] text-foreground sm:text-xl">
              {t("hero.productName")}
            </span>
          </div>
          <span
            className="landing-reveal inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm"
            style={{ "--landing-delay": "80ms" } as CSSProperties}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--source-doc)]" />
            {t("hero.badge")}
          </span>

          <h1
            className="landing-reveal mt-7 text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-foreground sm:text-5xl"
            style={{ "--landing-delay": "160ms" } as CSSProperties}
          >
            {t("hero.title1")}{" "}
            <span className="bg-gradient-to-r from-[var(--source-doc)] to-[var(--source-media)] bg-clip-text text-transparent">
              {t("hero.title2")}
            </span>
          </h1>

          <p
            className="landing-reveal mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg"
            style={{ "--landing-delay": "230ms" } as CSSProperties}
          >
            {t("hero.description")}
          </p>

          <div
            className="landing-reveal mt-10 flex flex-col items-center gap-3"
            style={{ "--landing-delay": "300ms" } as CSSProperties}
          >
            <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/dashboard"
                className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-px hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
              >
                {t("hero.primaryCta")}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={1.8}
                />
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-medium text-foreground shadow-sm transition-all hover:-translate-y-px hover:bg-accent hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
              >
                <GitHubIcon className="h-4 w-4" />
                {t("hero.secondaryCta")}
              </a>
            </div>
            <a
              href="#tour"
              onClick={(event) => {
                const tourSection = document.getElementById("tour");

                if (
                  !tourSection ||
                  typeof tourSection.scrollIntoView !== "function"
                ) {
                  return;
                }

                event.preventDefault();
                tourSection.scrollIntoView({
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "auto"
                    : "smooth",
                  block: "start",
                });
                window.history.pushState(null, "", "#tour");
              }}
              className="group inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--source-doc)]/40 px-5 text-sm font-medium text-muted-foreground transition-all hover:-translate-y-px hover:border-[var(--source-doc)] hover:bg-[var(--source-doc)]/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("hero.tourCta")}
              <ArrowDown
                className="h-4 w-4 transition-transform group-hover:translate-y-0.5"
                strokeWidth={1.8}
              />
            </a>
          </div>

          <p
            className="landing-reveal mt-6 text-sm text-muted-foreground/80"
            style={{ "--landing-delay": "370ms" } as CSSProperties}
          >
            {t("hero.footnote")}
          </p>
        </div>

        <div
          className="landing-reveal relative mx-auto mt-16 max-w-5xl lg:mt-20"
          style={{ "--landing-delay": "460ms" } as CSSProperties}
        >
          <MediaFrame
            src="/presentation/Dashboard-desktop.png"
            alt={t("tour.steps.desktop.alt")}
            wide
          />
        </div>
      </section>

      <section
        id="tour"
        className="scroll-mt-20 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <div
          className="landing-reveal"
          style={{ "--landing-delay": "500ms" } as CSSProperties}
        >
          <SectionHeading
            eyebrow={t("features.eyebrow")}
            title={t("features.title")}
            description={t("features.description")}
          />
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_KEYS.map((key, index) => {
            const Icon = FEATURE_ICONS[key];
            const title = t(`features.items.${key}.title`);
            const description = t(`features.items.${key}.description`);

            return (
              <div
                key={key}
                className="landing-reveal group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--source-doc)]/30 hover:shadow-md"
                style={
                  {
                    "--landing-delay": `${560 + index * 45}ms`,
                  } as CSSProperties
                }
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/60 text-[var(--source-doc)] transition-colors group-hover:bg-[var(--source-doc)]/10">
                  <Icon className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section
        aria-label={t("features.items.paperSizes.title")}
        className="border-y border-border/70 bg-muted/30 py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className="landing-reveal mx-auto max-w-2xl text-center"
            style={{ "--landing-delay": "650ms" } as CSSProperties}
          >
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
              {t("features.items.paperSizes.title")}
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              {t("features.items.paperSizes.description")}
            </p>
          </div>
          <div className="mt-12 flex flex-wrap items-end justify-center gap-8">
            {PAPER_SIZES.map((size) => (
              <div
                key={size.label}
                className="landing-reveal flex flex-col items-center gap-3"
                style={
                  {
                    "--landing-delay": `${720 + PAPER_SIZES.indexOf(size) * 60}ms`,
                  } as CSSProperties
                }
              >
                <div
                  className={`${size.widthClass} rounded-lg border border-border bg-card shadow-md transition-transform hover:-translate-y-1`}
                  style={{ aspectRatio: size.ratio }}
                />
                <span className="text-sm font-medium text-muted-foreground">
                  {size.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div
          className="landing-reveal"
          style={{ "--landing-delay": "920ms" } as CSSProperties}
        >
          <SectionHeading
            eyebrow={t("tour.eyebrow")}
            title={t("tour.title")}
            description={t("tour.description")}
          />
        </div>
        <div className="mt-14 space-y-20">
          {TOUR_STEPS.map((step, index) => {
            const title = t(`tour.steps.${step.key}.title`);
            const description = t(`tour.steps.${step.key}.description`);
            const alt = t(`tour.steps.${step.key}.alt`);
            const reversed = index % 2 === 1;

            return (
              <div
                key={step.key}
                className="landing-reveal grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
                style={
                  {
                    "--landing-delay": `${980 + index * 80}ms`,
                  } as CSSProperties
                }
              >
                <div
                  className={`flex justify-center lg:justify-start ${reversed ? "lg:order-2" : ""}`}
                >
                  <MediaFrame src={step.image} alt={alt} wide={step.wide} />
                </div>
                <div
                  className={`text-center lg:text-left ${reversed ? "lg:order-1" : ""}`}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">
                    {title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-border/70 bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className="landing-reveal"
            style={{ "--landing-delay": "1.5s" } as CSSProperties}
          >
            <SectionHeading
              eyebrow={t("tech.eyebrow")}
              title={t("tech.title")}
              description={t("tech.description")}
            />
          </div>
          <ul
            className="landing-reveal mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-2.5"
            style={{ "--landing-delay": "1.6s" } as CSSProperties}
          >
            {t.raw("tech.items").map((item: string) => (
              <li
                key={item}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:border-[var(--source-doc)]/30 hover:text-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer
        className="landing-reveal border-t border-border/70 bg-background"
        style={{ "--landing-delay": "1.75s" } as CSSProperties}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-14 text-center sm:px-6 lg:px-8">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card shadow-sm"
          >
            <Logo className="h-9 w-9" />
          </span>
          <p className="text-lg font-semibold tracking-[-0.02em] text-foreground">
            {t("footer.tagline")}
          </p>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            {t("footer.description")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-medium text-foreground transition-colors hover:text-[var(--source-doc)]"
            >
              <GitHubIcon className="h-4 w-4" />
              {t("footer.github")}
              <Star
                aria-hidden="true"
                className="h-3.5 w-3.5 fill-current"
                strokeWidth={1.7}
              />
            </a>
            <span
              aria-hidden="true"
              className="hidden h-4 w-px bg-border sm:block"
            />
            <Link
              href="/terms"
              className="font-medium transition-colors hover:text-[var(--source-doc)]"
            >
              {footerLabel("terms", "Terms")}
            </Link>
            <Link
              href="/privacy"
              className="font-medium transition-colors hover:text-[var(--source-doc)]"
            >
              {footerLabel("privacy", "Privacy")}
            </Link>
            <Link
              href="/cookies"
              className="font-medium transition-colors hover:text-[var(--source-doc)]"
            >
              {footerLabel("cookies", "Cookies")}
            </Link>
            <span
              aria-hidden="true"
              className="hidden h-4 w-px bg-border sm:block"
            />
            <span>{t("footer.license")}</span>
            <span
              aria-hidden="true"
              className="hidden h-4 w-px bg-border sm:block"
            />
            <span>{t("footer.builtWith")}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
