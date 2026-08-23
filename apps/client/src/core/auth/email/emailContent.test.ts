import { describe, expect, it } from "vitest";

import { buildVerificationEmailContent, resolveEmailLocale } from "./emailContent";

function requestWithLanguage(header?: string): Request {
  return new Request("https://example.com/sign-up", {
    headers: header ? { "accept-language": header } : {},
  });
}

describe("resolveEmailLocale", () => {
  it("maps the primary language tag to a supported locale", () => {
    expect(resolveEmailLocale(requestWithLanguage("es-AR, es;q=0.9"))).toBe(
      "es",
    );
    expect(resolveEmailLocale(requestWithLanguage("it-IT"))).toBe("it");
    expect(resolveEmailLocale(requestWithLanguage("en-US, en;q=0.8"))).toBe(
      "en",
    );
  });

  it("falls back to the next supported language", () => {
    expect(resolveEmailLocale(requestWithLanguage("de-DE, es;q=0.5"))).toBe(
      "es",
    );
  });

  it("defaults to English when nothing matches", () => {
    expect(resolveEmailLocale(requestWithLanguage("ja-JP"))).toBe("en");
    expect(resolveEmailLocale(requestWithLanguage())).toBe("en");
    expect(resolveEmailLocale(undefined)).toBe("en");
  });
});

describe("buildVerificationEmailContent", () => {
  it("includes the verification URL and the welcome message", () => {
    const { subject, html } = buildVerificationEmailContent({
      locale: "es",
      name: "Ana",
      verificationUrl: "https://example.com/verify?token=abc123",
    });

    expect(subject).toContain("Verifica");
    expect(html).toContain("https://example.com/verify?token=abc123");
    expect(html).toContain("Ana");
    expect(html).toContain("Andrew");
    expect(html).toContain("día a día");
  });

  it("escapes user input and uses a fallback greeting when the name is empty", () => {
    const { html } = buildVerificationEmailContent({
      locale: "en",
      name: "<script>alert(1)</script>",
      verificationUrl: "https://example.com/verify?token=abc123",
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");

    const withoutName = buildVerificationEmailContent({
      locale: "en",
      name: "   ",
      verificationUrl: "https://example.com/verify?token=abc123",
    });

    expect(withoutName.html).toContain("there");
  });
});
