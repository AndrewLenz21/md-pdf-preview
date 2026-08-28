import { describe, expect, it, vi } from "vitest";

const requestPasswordResetMock = vi.hoisted(() => vi.fn());
const resetPasswordMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: requestPasswordResetMock,
    resetPassword: resetPasswordMock,
  },
}));

import { requestPasswordReset } from "./requestPasswordReset";
import { resetPassword } from "./resetPassword";

describe("password reset services", () => {
  it("requests a reset link with the callback URL", async () => {
    requestPasswordResetMock.mockResolvedValueOnce({ data: { status: true } });
    const input = {
      email: "ana@example.com",
      redirectTo: "https://example.com/es/auth/reset-password",
      locale: "es",
    };

    await requestPasswordReset(input);

    expect(requestPasswordResetMock).toHaveBeenCalledWith(
      { email: input.email, redirectTo: input.redirectTo },
      { headers: { "accept-language": input.locale } },
    );
  });

  it("submits the new password and token", async () => {
    resetPasswordMock.mockResolvedValueOnce({ data: { status: true } });
    const input = { newPassword: "new-password", token: "token-123" };

    await resetPassword(input);

    expect(resetPasswordMock).toHaveBeenCalledWith(input);
  });
});
