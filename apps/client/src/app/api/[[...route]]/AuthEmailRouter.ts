import { Hono } from "hono";
import type { Context } from "hono";

import { auth } from "@/core/auth";
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
import { authPool } from "@/core/auth/pool";

const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

const authEmailRouter = new Hono();

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

async function readJSONBody(context: Context) {
  try {
    return {
      ok: true as const,
      value: (await context.req.json()) as Record<string, unknown>,
    };
  } catch (error) {
    console.error("[AuthEmailRouter] invalid JSON request body:", error);
    return {
      ok: false as const,
      response: context.json(
        {
          code: "INVALID_REQUEST_BODY",
          message: "Request body must be valid JSON.",
        },
        400,
      ),
    };
  }
}

async function reserveAttempt(
  context: Context,
  email: string,
  cooldownMs?: number,
) {
  try {
    const reservation = await reserveEmailDelivery({
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

authEmailRouter.post("/sign-up/email", async (context) => {
  const body = await readJSONBody(context);
  if (!body.ok) {
    return body.response;
  }

  const email = typeof body.value.email === "string" ? body.value.email : "";

  const reservation = await reserveAttempt(context, email);
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

authEmailRouter.post("/send-verification-email", async (context) => {
  const body = await readJSONBody(context);
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

  const reservation = await reserveAttempt(context, email, RESEND_COOLDOWN_MS);
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

export default authEmailRouter;
