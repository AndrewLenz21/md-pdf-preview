// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import enMessages from "../messages/en.json";

const resetPasswordMock = vi.hoisted(() => vi.fn());

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    enMessages.resetPassword[key as keyof typeof enMessages.resetPassword] ??
    key,
}));

vi.mock("@/core/i18n", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("../services/resetPassword", () => ({
  resetPassword: resetPasswordMock,
}));

import { ResetPasswordForm } from "./ResetPasswordForm";

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("ResetPasswordForm", () => {
  it("rejects mismatched passwords before calling the service", () => {
    render(<ResetPasswordForm token="token-123" />);
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "different-password" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Reset password" }));

    expect(screen.getByRole("alert").textContent).toBe("Passwords do not match.");
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("resets the password with a valid token", async () => {
    resetPasswordMock.mockResolvedValueOnce({ data: { status: true }, error: null });

    render(<ResetPasswordForm token="token-123" />);
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "new-password" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByText("Password reset")).toBeTruthy();
    expect(resetPasswordMock).toHaveBeenCalledWith({
      newPassword: "new-password",
      token: "token-123",
    });
  });
});
