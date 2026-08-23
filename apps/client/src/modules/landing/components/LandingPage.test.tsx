// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const intlState = vi.hoisted(() => ({
  messages: {} as Record<string, unknown>,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const resolve = (key: string) =>
      key.split(".").reduce<unknown>((value, segment) => {
        if (typeof value !== "object" || value === null) {
          return undefined;
        }

        return (value as Record<string, unknown>)[segment];
      }, intlState.messages);

    return Object.assign((key: string) => String(resolve(key) ?? key), {
      has: (key: string) => resolve(key) !== undefined,
      raw: (key: string) => resolve(key),
    });
  },
}));

vi.mock("@/core/i18n", () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import enMessages from "../messages/en.json";
import esMessages from "../messages/es.json";
import itMessages from "../messages/it.json";

import { LandingPage } from "./LandingPage";

function renderLanding(locale: string, messages: Record<string, unknown>) {
  void locale;
  intlState.messages = messages;
  return render(<LandingPage />);
}

describe("LandingPage", () => {
  it("renders the English hero, sections, and footer", () => {
    renderLanding("en", enMessages);

    expect(
      screen.getByRole("heading", {
        name: /Write once\. Preview every page\./i,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Fidelity-first preview" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "From blank page to print" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Built for precision" }),
    ).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getByText("View the source on GitHub")).toBeTruthy();
  });

  it("renders the Spanish hero and calls to action", () => {
    renderLanding("es", esMessages);

    expect(
      screen.getByRole("heading", {
        name: /Escribe una vez\. Previsualiza cada página\./i,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Previsualización fiel" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Abrir la aplicación/i }),
    ).toBeTruthy();
    expect(screen.getByText("Hecho con OpenCode")).toBeTruthy();
  });

  it("renders the Italian hero", () => {
    renderLanding("it", itMessages);

    expect(
      screen.getByRole("heading", {
        name: /Scrivi una volta\. Anteprima di ogni pagina\./i,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Anteprima fedele" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /Apri l'app/i })).toBeTruthy();
  });
});
