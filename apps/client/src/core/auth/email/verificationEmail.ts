import { APIError } from "better-auth";
import type { Pool } from "pg";

import {
  EMAIL_ATTEMPT_ID_HEADER,
  EMAIL_ATTEMPT_KIND_HEADER,
  EMAIL_DELIVERY_STATUS,
  EMAIL_PURPOSE,
  EMAIL_PROVIDER,
  QUOTA_STATUSES,
  type EmailAttemptKind,
} from "./emailDeliveries";
import { resolveEmailLocale } from "./emailContent";
import * as emailDeliveryRepository from "./emailDeliveryRepository";
import { QuotaExceededError, reserveEmailDelivery } from "./emailQuota";
import {
  ResendSendError,
  sendVerificationEmail as resendSend,
} from "./resendService";

const DAILY_LIMIT_ERROR_BODY = {
  code: "DAILY_REGISTRATION_LIMIT_REACHED",
  message:
    "We've reached today's registration limit. Please try again tomorrow.",
};

const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

interface VerificationUser {
  id: string;
  email: string;
  name: string;
}

interface AttemptContext {
  id: string | null;
  kind: EmailAttemptKind;
}

type VerificationEmailSender = (input: {
  body: { email: string; callbackURL: string };
  headers: Headers;
  asResponse: true;
}) => Promise<Response>;

function readAttempt(request?: Request): AttemptContext {
  return {
    id: request?.headers.get(EMAIL_ATTEMPT_ID_HEADER) ?? null,
    kind:
      request?.headers.get(EMAIL_ATTEMPT_KIND_HEADER) === "sign-up"
        ? "sign-up"
        : "resend",
  };
}

function describeSendError(error: unknown) {
  if (error instanceof ResendSendError) {
    return { code: error.providerCode, message: error.message };
  }

  return {
    code: null,
    message:
      error instanceof Error ? error.message : "Unknown email send error.",
  };
}

/**
 * Resolves the quota slot to use for a send. Routes wrapped by
 * AuthEmailRouter pre-reserve the slot and pass it through the attempt
 * header; other paths (e.g. expired verification links) reserve here.
 */
async function resolveDeliverySlot(
  authPool: Pool,
  attempt: AttemptContext,
  email: string,
): Promise<{ id: string; idempotencyKey: string }> {
  if (attempt.id) {
    const row = await emailDeliveryRepository.getDeliveryById(
      authPool,
      attempt.id,
    );

    if (!row || row.status !== EMAIL_DELIVERY_STATUS.RESERVED) {
      throw new APIError("BAD_REQUEST", {
        code: "EMAIL_DELIVERY_SLOT_UNAVAILABLE",
        message: "Email delivery slot is unavailable.",
      });
    }

    return { id: row.id, idempotencyKey: row.idempotencyKey };
  }

  try {
    const reservation = await reserveEmailDelivery({
      authPool,
      email,
      purpose: EMAIL_PURPOSE.EMAIL_VERIFICATION,
      provider: EMAIL_PROVIDER.RESEND,
    });

    return { id: reservation.id, idempotencyKey: reservation.idempotencyKey };
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      throw new APIError("TOO_MANY_REQUESTS", DAILY_LIMIT_ERROR_BODY);
    }

    throw error;
  }
}

/**
 * Better Auth email verification callback. When the send fails during a
 * sign-up the just-created account is rolled back, so an account only ever
 * persists when its verification email actually reached the provider.
 */
export async function sendVerificationEmail(
  authPool: Pool,
  data: { user: VerificationUser; url: string; token: string },
  request?: Request,
): Promise<void> {
  const attempt = readAttempt(request);
  const slot = await resolveDeliverySlot(authPool, attempt, data.user.email);

  try {
    const { providerMessageId } = await resendSend({
      to: data.user.email,
      name: data.user.name,
      locale: resolveEmailLocale(request),
      verificationUrl: data.url,
      idempotencyKey: slot.idempotencyKey,
    });

    await emailDeliveryRepository.markAccepted(authPool, {
      id: slot.id,
      providerMessageId,
      userId: data.user.id,
    });
  } catch (error) {
    const described = describeSendError(error);

    await emailDeliveryRepository.markRequestFailed(authPool, {
      id: slot.id,
      errorCode: described.code,
      errorMessage: described.message.slice(0, 500),
    });

    if (attempt.kind === "sign-up") {
      // Roll the account back: a failed send must never leave an
      // unusable, unverified user behind.
      await emailDeliveryRepository.deleteAuthUser(authPool, data.user.id);
    }

    throw new APIError("INTERNAL_SERVER_ERROR", {
      code: "VERIFICATION_EMAIL_SEND_FAILED",
      message: "We couldn't send your verification email. Please try again.",
    });
  }
}

/**
 * Better Auth `onExistingUserSignUp` hook. Duplicate sign-ups return a
 * synthetic success (anti-enumeration), so we resend the verification email
 * to the real owner instead of failing. The wrapper's pre-reserved slot is
 * consumed by the send; when the cooldown blocks it the slot is freed.
 */
export async function resendVerificationEmailToExistingUser(
  authPool: Pool,
  sendVerificationEmail: VerificationEmailSender,
  data: { user: VerificationUser },
  request?: Request,
): Promise<void> {
  const attempt = readAttempt(request);

  if (!attempt.id) {
    return;
  }

  const row = await emailDeliveryRepository.getDeliveryById(
    authPool,
    attempt.id,
  );

  if (!row || row.status !== EMAIL_DELIVERY_STATUS.RESERVED) {
    return;
  }

  const recent = await emailDeliveryRepository.findRecentDelivery(authPool, {
    email: data.user.email,
    since: new Date(Date.now() - RESEND_COOLDOWN_MS),
    statuses: QUOTA_STATUSES,
  });

  if (recent) {
    await emailDeliveryRepository.cancelIfReserved(authPool, row.id);
    return;
  }

  const headers = new Headers(request?.headers);
  headers.set(EMAIL_ATTEMPT_ID_HEADER, attempt.id);
  headers.set(EMAIL_ATTEMPT_KIND_HEADER, "resend");

  try {
    // Reuse Better Auth's own resend endpoint so it mints a fresh
    // verification token; the slot is consumed by the callback above.
    await sendVerificationEmail({
      body: { email: data.user.email, callbackURL: "/" },
      headers,
      asResponse: true,
    });
  } catch (error) {
    console.error("[verificationEmail] resend to existing user failed:", error);
  }

  const status = await emailDeliveryRepository.getDeliveryStatus(
    authPool,
    attempt.id,
  );

  if (status === EMAIL_DELIVERY_STATUS.RESERVED) {
    await emailDeliveryRepository.cancelIfReserved(authPool, attempt.id);
  }
}
