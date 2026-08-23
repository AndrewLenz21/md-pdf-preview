import { describe, expect, it, vi } from "vitest";

const socialSignIn = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: vi.fn(),
      social: socialSignIn,
    },
  },
}));

import { signInWithSocial } from "./signIn";

describe("signInWithSocial", () => {
  it.each(["google", "github"] as const)(
    "starts a %s sign-in with the localized callback",
    async (provider) => {
      socialSignIn.mockResolvedValueOnce({ data: null, error: null });

      await signInWithSocial({
        provider,
        callbackURL: "/es/dashboard",
      });

      expect(socialSignIn).toHaveBeenCalledWith({
        provider,
        callbackURL: "/es/dashboard",
      });
    },
  );
});
