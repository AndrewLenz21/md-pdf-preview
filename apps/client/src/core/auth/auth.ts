import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import type { Pool } from "pg";

import {
  resendVerificationEmailToExistingUser,
  sendVerificationEmail,
} from "./email/verificationEmail";
import { sendAccountDeletionConfirmationEmail } from "./email/accountDeletionEmail";
import { authPool, createAuthPool, requiredEnvironmentVariable } from "./pool";
import appServer from "@/lib/backend/server";

const identifyMissingEmailSignInUser = createAuthMiddleware(async (context) => {
  if (context.path !== "/sign-in/email") {
    return;
  }

  const body = context.body as { email?: unknown } | undefined;
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!email || !email.includes("@")) {
    return;
  }

  const user = await context.context.internalAdapter.findUserByEmail(email);
  if (user) {
    return;
  }

  context.context.logger.warn("User not found");
  throw APIError.from("UNAUTHORIZED", {
    code: "USER_NOT_FOUND",
    message: "User not found",
  });
});

function createAuthWithPool(authPool: Pool) {
  const authSecret = requiredEnvironmentVariable("BETTER_AUTH_SECRET");
  const authUrl = requiredEnvironmentVariable("BETTER_AUTH_URL");
  const googleClientId = requiredEnvironmentVariable("GOOGLE_CLIENT_ID");
  const googleClientSecret = requiredEnvironmentVariable(
    "GOOGLE_CLIENT_SECRET",
  );
  const githubClientId = requiredEnvironmentVariable("GITHUB_CLIENT_ID");
  const githubClientSecret = requiredEnvironmentVariable(
    "GITHUB_CLIENT_SECRET",
  );
  const deletionRequestReferences = new WeakMap<Request, string>();

  if (authSecret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }

  new URL(authUrl);

  const resendVerificationEmail: Parameters<
    typeof resendVerificationEmailToExistingUser
  >[1] = (input) => auth.api.sendVerificationEmail(input);

  const auth = betterAuth({
    database: authPool,
    secret: authSecret,
    baseURL: authUrl,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      onExistingUserSignUp: (data, request) =>
        resendVerificationEmailToExistingUser(
          authPool,
          resendVerificationEmail,
          data,
          request,
        ),
    },
    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
      github: {
        clientId: githubClientId,
        clientSecret: githubClientSecret,
      },
    },
    emailVerification: {
      sendVerificationEmail: (data, request) =>
        sendVerificationEmail(authPool, data, request),
      sendOnSignUp: true,
      sendOnSignIn: false,
      autoSignInAfterVerification: true,
    },
    hooks: {
      before: identifyMissingEmailSignInUser,
    },
    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: async (user, request) => {
          let response: Response;

          try {
            response = await appServer
              .withUser(user.id)
              .delete("account/cloud-data");
          } catch (error) {
            console.error(
              "[Auth] account cloud cleanup request failed:",
              error,
            );
            throw new Error("Account cloud cleanup failed.");
          }

          if (!response.ok) {
            console.error(
              `[Auth] account cloud cleanup returned ${response.status}`,
            );
            throw new Error("Account cloud cleanup failed.");
          }

          if (request) {
            deletionRequestReferences.set(
              request,
              response.headers.get("X-Request-ID")?.trim() || randomUUID(),
            );
          }
        },
        afterDelete: async (user, request) => {
          const requestReference = request
            ? deletionRequestReferences.get(request)
            : undefined;
          const deletionReference = `DEL-${requestReference ?? randomUUID()}`;

          try {
            // Better Auth's verification table has no user foreign key. Remove
            // the email verification and reset tokens for this account after
            // native user deletion.
            await authPool.query(
              'DELETE FROM "verification" WHERE "identifier" = $1',
              [user.email],
            );
          } catch (error) {
            console.error(
              "[Auth] verification cleanup after deletion failed:",
              error,
            );
          }

          try {
            await sendAccountDeletionConfirmationEmail(
              authPool,
              user,
              deletionReference,
              request,
            );
          } catch (error) {
            console.error(
              "[Auth] account deletion confirmation email failed:",
              error,
            );
          } finally {
            if (request) {
              deletionRequestReferences.delete(request);
            }
          }
        },
      },
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

  return auth;
}

export function createAuth() {
  const authPool = createAuthPool();
  const auth = createAuthWithPool(authPool);

  return { auth, authPool };
}

/**
 * Temporary compatibility export. Remove after API consumers use createAuth().
 */
export const auth = createAuthWithPool(authPool);
