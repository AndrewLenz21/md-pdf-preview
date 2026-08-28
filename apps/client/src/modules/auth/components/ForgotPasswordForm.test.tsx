// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import enMessages from "../messages/en.json";

const requestPasswordResetMock = vi.hoisted(() => vi.fn());

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, string>) => {
    const message = enMessages.forgotPassword[key as keyof typeof enMessages.forgotPassword];

    if (typeof message !== "string") {
      return key;
    }

    return values
      ? message.replace("{email}", values.email ?? "")
      : message;
  },
}));

vi.mock("@/core/i18n", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("../services/requestPasswordReset", () => ({
  requestPasswordReset: requestPasswordResetMock,
}));

import { ForgotPasswordForm } from "./ForgotPasswordForm";

describe("ForgotPasswordForm", () => {
  it("shows a generic success message after requesting a reset link", async () => {
    requestPasswordResetMock.mockResolvedValueOnce({
      data: { status: true },
      error: null,
    });

    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText("Check your inbox")).toBeTruthy();
    expect(requestPasswordResetMock).toHaveBeenCalledWith({
      email: "ana@example.com",
      redirectTo: "http://localhost:3000/en/auth/reset-password",
      locale: "en",
    });
    expect(
      screen.getByText(
        "If an account exists for ana@example.com, we'll send a password reset link shortly.",
      ),
    ).toBeTruthy();
  });
});
