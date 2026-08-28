/*=============================================================================
 * ✉️ AUTH EMAIL ROUTER
 *=============================================================================
 * Handles email-based authentication workflows (user registration & email
 * verification resends). Enforces daily quota limits, request cooldowns,
 * and maintains email delivery reservation tracking.
 *=============================================================================*/

/*===== 📦 IMPORTS =====*/
import { Hono } from "hono";
import type { Context } from "hono";
import type { Next } from "hono";
import type { Pool } from "pg";

import {
  EMAIL_ATTEMPT_ID_HEADER,
  EMAIL_ATTEMPT_KIND_HEADER,
  EMAIL_DELIVERY_STATUS,
  EMAIL_PURPOSE,
  EMAIL_PROVIDER,
} from "@/core/auth/email/emailDeliveries";
import * as emailDeliveryRepository from "@/core/auth/email/emailDeliveryRepository";
import {
  CooldownActiveError,
  QuotaExceededError,
  reserveEmailDelivery,
  secondsUntilQuotaReset,
} from "@/core/auth/email/emailQuota";
import { readJSONBody } from "@/lib/server/hono";
import { type RequestAuth, withRequestAuth } from "@/lib/server/request-auth";

/*===== ⚙️ CONSTANTS & TYPES =====*/

// Minimum time delay (5 minutes) allowed between consecutive verification resend requests
const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

// Type definition for Hono context environment containing request auth variables
type AuthEmailEnv = {
  Variables: RequestAuth;
};

/*===== 🔐 ROUTER INITIALIZATION & MIDDLEWARE =====*/

const authEmailRouter = new Hono<AuthEmailEnv>();

/**
 * Middleware that injects request authentication context (`auth` & `authPool`) into Hono's environment variables.
 */
async function attachRequestAuth(context: Context<AuthEmailEnv>, next: Next) {
  return withRequestAuth(async ({ auth, authPool }) => {
    context.set("auth", auth);
    context.set("authPool", authPool);
    return await next();
  });
}

// Apply authentication middleware to email auth routes
authEmailRouter.use("/sign-up/email", attachRequestAuth);
authEmailRouter.use("/send-verification-email", attachRequestAuth);

/*===== 🛠️ HELPER FUNCTIONS & QUOTA MANAGEMENT =====*/

/**
 * Returns a standardized 429 Too Many Requests HTTP response when the daily registration quota is reached.
 */
function dailyLimitResponse(context: Context) {
  return context.json(
    {
      code: "DAILY_REGISTRATION_LIMIT_REACHED",
      message:
        "We've reached today's registration limit. Please try again tomorrow.",
    },
    429,
    { "Retry-After": String(secondsUntilQuotaReset()) },
  );
}

/**
 * Attempts to reserve an email delivery slot for a given address.
 * Handles quota limits and cooldown errors gracefully by returning pre-formatted error responses.
 */
async function reserveAttempt(
  context: Context,
  authPool: Pool,
  email: string,
  cooldownMs?: number,
) {
  try {
    const reservation = await reserveEmailDelivery({
      authPool,
      email,
      purpose: EMAIL_PURPOSE.EMAIL_VERIFICATION,
      provider: EMAIL_PROVIDER.RESEND,
      cooldownMs,
    });

    return { ok: true as const, reservation };
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return { ok: false as const, response: dailyLimitResponse(context) };
    }

    if (error instanceof CooldownActiveError) {
      return {
        ok: false as const,
        response: context.json(
          {
            code: "VERIFICATION_EMAIL_COOLDOWN",
            message:
              "We just sent you a verification email. Please wait a few minutes before requesting another one.",
          },
          429,
          { "Retry-After": String(error.retryAfterSeconds) },
        ),
      };
    }

    throw error;
  }
}

/**
 * Enriches request headers with delivery attempt tracking metadata before delegating to Better Auth.
 */
function withAttemptHeaders(
  context: Context,
  reservation: { id: string },
  kind: "sign-up" | "resend",
) {
  const headers = new Headers(context.req.raw.headers);
  headers.set(EMAIL_ATTEMPT_ID_HEADER, reservation.id);
  headers.set(EMAIL_ATTEMPT_KIND_HEADER, kind);
  return headers;
}

/*===== 📨 EMAIL AUTH ENDPOINTS =====*/

/**
 * 📝 POST /sign-up/email
 * Registers a new user account with email authentication.
 * Reserves an email slot, invokes Better Auth API, and manages delivery state rollbacks on failure.
 */
authEmailRouter.post("/sign-up/email", async (context) => {
  const auth = context.get("auth");
  const authPool = context.get("authPool");
  const body = await readJSONBody<Record<string, unknown>>(
    context,
    "AuthEmailRouter",
  );
  if (!body.ok) {
    return body.response;
  }

  const email = typeof body.value.email === "string" ? body.value.email : "";

  // Reserve a quota/delivery slot before attempting sign-up
  const reservation = await reserveAttempt(context, authPool, email);
  if (!reservation.ok) {
    return reservation.response;
  }

  let response: Response;

  try {
    response = await auth.api.signUpEmail({
      body: body.value as never,
      headers: withAttemptHeaders(context, reservation.reservation, "sign-up"),
      asResponse: true,
    });
  } catch (error) {
    console.error("[AuthEmailRouter] sign-up dispatch failed:", error);
    await emailDeliveryRepository.cancelIfReserved(
      authPool,
      reservation.reservation.id,
    );
    return context.json(
      {
        code: "SIGN_UP_UNAVAILABLE",
        message: "Sign-up is temporarily unavailable.",
      },
      503,
    );
  }

  if (!response.ok) {
    await emailDeliveryRepository.cancelIfReserved(
      authPool,
      reservation.reservation.id,
    );
    return response;
  }

  const status = await emailDeliveryRepository.getDeliveryStatus(
    authPool,
    reservation.reservation.id,
  );

  if (status === EMAIL_DELIVERY_STATUS.ACCEPTED) {
    return response;
  }

  if (status === EMAIL_DELIVERY_STATUS.RESERVED) {
    // The endpoint succeeded without sending (e.g. an existing account
    // was protected by the cooldown). Free the slot.
    await emailDeliveryRepository.cancelIfReserved(
      authPool,
      reservation.reservation.id,
    );
    return response;
  }

  // The send never reached the provider and the account was rolled back.
  return context.json(
    {
      code: "VERIFICATION_EMAIL_SEND_FAILED",
      message: "We couldn't send your verification email. Please try again.",
    },
    502,
  );
});

/**
 * 🔄 POST /send-verification-email
 * Resends a verification email to an unverified user account.
 * Enforces cooldown timers and checks email delivery statuses.
 */
authEmailRouter.post("/send-verification-email", async (context) => {
  const auth = context.get("auth");
  const authPool = context.get("authPool");
  const body = await readJSONBody<Record<string, unknown>>(
    context,
    "AuthEmailRouter",
  );
  if (!body.ok) {
    return body.response;
  }

  const email = typeof body.value.email === "string" ? body.value.email : "";

  if (!email) {
    return context.json(
      { code: "INVALID_REQUEST_BODY", message: "Email is required." },
      400,
    );
  }

  // Reserve delivery slot with resend cooldown applied
  const reservation = await reserveAttempt(
    context,
    authPool,
    email,
    RESEND_COOLDOWN_MS,
  );
  if (!reservation.ok) {
    return reservation.response;
  }

  let response: Response;

  try {
    response = await auth.api.sendVerificationEmail({
      body: {
        email,
        callbackURL:
          typeof body.value.callbackURL === "string"
            ? body.value.callbackURL
            : undefined,
      } as never,
      headers: withAttemptHeaders(context, reservation.reservation, "resend"),
      asResponse: true,
    });
  } catch (error) {
    console.error("[AuthEmailRouter] resend dispatch failed:", error);
    await emailDeliveryRepository.cancelIfReserved(
      authPool,
      reservation.reservation.id,
    );
    return context.json(
      {
        code: "RESEND_UNAVAILABLE",
        message: "Verification email resend is temporarily unavailable.",
      },
      503,
    );
  }

  if (!response.ok) {
    await emailDeliveryRepository.cancelIfReserved(
      authPool,
      reservation.reservation.id,
    );
    return response;
  }

  const status = await emailDeliveryRepository.getDeliveryStatus(
    authPool,
    reservation.reservation.id,
  );

  if (status === EMAIL_DELIVERY_STATUS.RESERVED) {
    // The endpoint answered success without sending (e.g. the email is
    // already verified). Free the slot.
    await emailDeliveryRepository.cancelIfReserved(
      authPool,
      reservation.reservation.id,
    );
  }

  return response;
});

/*===== 📤 ROUTER EXPORT =====*/
export default authEmailRouter;

