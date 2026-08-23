"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/core/i18n";

import { LEGAL_DATES } from "../dates";

export type LegalDocument = "privacy" | "terms" | "cookies";

type LegalTranslation = ReturnType<typeof useTranslations>;

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function TextBlocks({ t, path }: { t: LegalTranslation; path: string }) {
  const paragraphs = t.raw(path) as string[];

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="text-sm leading-7 text-muted-foreground">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function BulletList({ t, path }: { t: LegalTranslation; path: string }) {
  const bullets = t.raw(path) as string[];

  return (
    <ul className="mt-4 space-y-3 pl-5 text-sm leading-7 text-muted-foreground marker:text-primary">
      {bullets.map((bullet) => (
        <li key={bullet} className="pl-1">
          {bullet}
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border/70 pt-8 first:border-t-0 first:pt-0">
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PolicyHeader({
  t,
  document,
  locale,
}: {
  t: LegalTranslation;
  document: LegalDocument;
  locale: string;
}) {
  return (
    <header className="border-b border-border/70 pb-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {t("label")}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
        {t(`${document}.title`)}
      </h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
        {t(`${document}.summary`)}
      </p>
      <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-xs text-muted-foreground">
        <div>
          <dt className="inline font-semibold text-foreground">
            {t("dates.effective")}:
          </dt>{" "}
          <dd className="inline">{formatDate(LEGAL_DATES.effective, locale)}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-foreground">
            {t("dates.updated")}:
          </dt>{" "}
          <dd className="inline">{formatDate(LEGAL_DATES.updated, locale)}</dd>
        </div>
      </dl>
    </header>
  );
}

function PrivacyDocument({ t }: { t: LegalTranslation }) {
  return (
    <>
      <Section title={t("privacy.sections.controller.title")}>
        <TextBlocks t={t} path="privacy.sections.controller.paragraphs" />
      </Section>
      <Section title={t("privacy.sections.scope.title")}>
        <TextBlocks t={t} path="privacy.sections.scope.paragraphs" />
      </Section>
      <Section title={t("privacy.sections.data.title")}>
        <TextBlocks t={t} path="privacy.sections.data.paragraphs" />
        <BulletList t={t} path="privacy.sections.data.bullets" />
      </Section>
      <Section title={t("privacy.sections.local.title")}>
        <TextBlocks t={t} path="privacy.sections.local.paragraphs" />
        <BulletList t={t} path="privacy.sections.local.bullets" />
      </Section>
      <Section title={t("privacy.sections.authentication.title")}>
        <TextBlocks t={t} path="privacy.sections.authentication.paragraphs" />
        <BulletList t={t} path="privacy.sections.authentication.bullets" />
      </Section>
      <Section title={t("privacy.sections.google.title")}>
        <TextBlocks t={t} path="privacy.sections.google.paragraphs" />
        <BulletList t={t} path="privacy.sections.google.bullets" />
      </Section>
      <Section title={t("privacy.sections.github.title")}>
        <TextBlocks t={t} path="privacy.sections.github.paragraphs" />
        <BulletList t={t} path="privacy.sections.github.bullets" />
      </Section>
      <Section title={t("privacy.sections.purposes.title")}>
        <TextBlocks t={t} path="privacy.sections.purposes.paragraphs" />
        <BulletList t={t} path="privacy.sections.purposes.bullets" />
      </Section>
      <Section title={t("privacy.sections.processors.title")}>
        <TextBlocks t={t} path="privacy.sections.processors.paragraphs" />
        <BulletList t={t} path="privacy.sections.processors.bullets" />
      </Section>
      <Section title={t("privacy.sections.transfers.title")}>
        <TextBlocks t={t} path="privacy.sections.transfers.paragraphs" />
      </Section>
      <Section title={t("privacy.sections.retention.title")}>
        <TextBlocks t={t} path="privacy.sections.retention.paragraphs" />
        <BulletList t={t} path="privacy.sections.retention.bullets" />
      </Section>
      <Section title={t("privacy.sections.rights.title")}>
        <TextBlocks t={t} path="privacy.sections.rights.paragraphs" />
        <BulletList t={t} path="privacy.sections.rights.bullets" />
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {t("privacy.sections.rights.complaint")} {" "}
          <a
            href="https://www.garanteprivacy.it/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            {t("privacy.sections.rights.garante")}
          </a>
          .
        </p>
      </Section>
      <Section title={t("privacy.sections.deletion.title")}>
        <TextBlocks t={t} path="privacy.sections.deletion.paragraphs" />
      </Section>
      <Section title={t("privacy.sections.security.title")}>
        <TextBlocks t={t} path="privacy.sections.security.paragraphs" />
      </Section>
      <Section title={t("privacy.sections.changes.title")}>
        <TextBlocks t={t} path="privacy.sections.changes.paragraphs" />
      </Section>
      <Section title={t("privacy.sections.contact.title")}>
        <TextBlocks t={t} path="privacy.sections.contact.paragraphs" />
      </Section>
    </>
  );
}

function TermsDocument({ t }: { t: LegalTranslation }) {
  const sections = [
    "acceptance",
    "eligibility",
    "service",
    "free",
    "accounts",
    "authentication",
    "acceptableUse",
    "userContent",
    "intellectualProperty",
    "openSource",
    "thirdParties",
    "availability",
    "changesService",
    "suspension",
    "deletion",
    "warranties",
    "liability",
    "changesTerms",
    "law",
    "contact",
  ] as const;

  return (
    <>
      {sections.map((section) => (
        <Section key={section} title={t(`terms.sections.${section}.title`)}>
          <TextBlocks t={t} path={`terms.sections.${section}.paragraphs`} />
          {t.has(`terms.sections.${section}.bullets`) ? (
            <BulletList t={t} path={`terms.sections.${section}.bullets`} />
          ) : null}
        </Section>
      ))}
    </>
  );
}

function CookiesDocument({ t }: { t: LegalTranslation }) {
  const rows = t.raw("cookies.table.rows") as Array<{
    name: string;
    provider: string;
    purpose: string;
    category: string;
    duration: string;
  }>;

  return (
    <>
      <Section title={t("cookies.sections.notice.title")}>
        <TextBlocks t={t} path="cookies.sections.notice.paragraphs" />
      </Section>
      <Section title={t("cookies.table.title")}>
        <div className="mt-2 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {(["name", "provider", "purpose", "category", "duration"] as const).map(
                  (column) => (
                    <th key={column} className="border-b border-border px-4 py-3 font-semibold">
                      {t(`cookies.table.columns.${column}`)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="align-top even:bg-muted/20">
                  <td className="border-b border-border px-4 py-3 font-mono text-xs text-foreground">
                    {row.name}
                  </td>
                  <td className="border-b border-border px-4 py-3 text-muted-foreground">
                    {row.provider}
                  </td>
                  <td className="border-b border-border px-4 py-3 text-muted-foreground">
                    {row.purpose}
                  </td>
                  <td className="border-b border-border px-4 py-3 text-muted-foreground">
                    {row.category}
                  </td>
                  <td className="border-b border-border px-4 py-3 text-muted-foreground">
                    {row.duration}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title={t("cookies.sections.categories.title")}>
        <TextBlocks t={t} path="cookies.sections.categories.paragraphs" />
        <BulletList t={t} path="cookies.sections.categories.bullets" />
      </Section>
      <Section title={t("cookies.sections.control.title")}>
        <TextBlocks t={t} path="cookies.sections.control.paragraphs" />
      </Section>
      <Section title={t("cookies.sections.changes.title")}>
        <TextBlocks t={t} path="cookies.sections.changes.paragraphs" />
      </Section>
      <Section title={t("cookies.sections.contact.title")}>
        <TextBlocks t={t} path="cookies.sections.contact.paragraphs" />
      </Section>
    </>
  );
}

export function LegalPage({ document }: { document: LegalDocument }) {
  const locale = useLocale();
  const t = useTranslations("Legal");

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8 lg:py-20">
      <article className="mx-auto max-w-4xl">
        <PolicyHeader t={t} document={document} locale={locale} />
        <div className="mt-10 space-y-8">
          {document === "privacy" ? <PrivacyDocument t={t} /> : null}
          {document === "terms" ? <TermsDocument t={t} /> : null}
          {document === "cookies" ? <CookiesDocument t={t} /> : null}
        </div>
        <nav
          aria-label={t("related.label")}
          className="mt-12 flex flex-wrap gap-x-6 gap-y-3 border-t border-border/70 pt-6 text-sm font-medium"
        >
          <Link href="/terms" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
            {t("related.terms")}
          </Link>
          <Link href="/privacy" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
            {t("related.privacy")}
          </Link>
          <Link href="/cookies" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
            {t("related.cookies")}
          </Link>
          <Link href="/" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
            {t("related.home")}
          </Link>
        </nav>
      </article>
    </main>
  );
}
