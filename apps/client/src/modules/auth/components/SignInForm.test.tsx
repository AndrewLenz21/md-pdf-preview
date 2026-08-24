// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import enMessages from "../messages/en.json";

const signInMock = vi.hoisted(() => vi.fn());
const intlState = vi.hoisted(() => ({
  messages: {} as Record<string, string>,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => intlState.messages[key] ?? key,
}));

vi.mock("@/core/i18n", () => ({
  Link: ({
    href,
    children,
  }: {
    href: string;
    children: ReactNode;
  }) => <a href={href}>{children}</a>,
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("../services/sendVerificationEmail", () => ({
  sendVerificationEmail: vi.fn(),
}));

vi.mock("../services/signIn", () => ({
  signIn: signInMock,
}));

vi.mock("./SocialAuthButtons", () => ({
  SocialAuthButtons: () => <div data-testid="social-auth" />,
}));

import { SignInForm } from "./SignInForm";

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("SignInForm", () => {
  it("shows a user-not-found message without moving the submit button", async () => {
    intlState.messages = enMessages.signIn;
    signInMock.mockResolvedValueOnce({
      data: null,
      error: { code: "USER_NOT_FOUND", message: "User not found" },
    });

    render(<SignInForm />);

    const button = screen.getByRole("button", { name: "Sign in" });
    const initialButtonClass = button.className;
    const form = button.closest("form");

    if (!form) {
      throw new Error("Sign-in form was not rendered.");
    }

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "missing@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });
    fireEvent.submit(form);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("User not found.");
    expect(button.className).toBe(initialButtonClass);
    expect(button.className).toContain("mt-1");
    expect(alert.parentElement?.className).toContain("h-5");
  });
});
