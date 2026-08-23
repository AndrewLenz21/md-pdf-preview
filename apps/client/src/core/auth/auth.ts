import { betterAuth } from "better-auth";

import {
  resendVerificationEmailToExistingUser,
  sendVerificationEmail,
} from "./email/verificationEmail";
import { authPool, requiredEnvironmentVariable } from "./pool";

const authSecret = requiredEnvironmentVariable("BETTER_AUTH_SECRET");
const authUrl = requiredEnvironmentVariable("BETTER_AUTH_URL");

if (authSecret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
}

new URL(authUrl);

export const auth = betterAuth({
  database: authPool,
  secret: authSecret,
  baseURL: authUrl,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    onExistingUserSignUp: resendVerificationEmailToExistingUser,
  },
  emailVerification: {
    sendVerificationEmail,
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: true,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/send-verification-email": { window: 600, max: 5 },
    },
  },
  advanced: {
    ipAddress: {
      // Trust this header only when Cloudflare fronts the Next.js origin.
      ipAddressHeaders: ["cf-connecting-ip"],
    },
    database: {
      generateId: "uuid",
    },
  },
});
