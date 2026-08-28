import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

import {
  EMAIL_PROVIDER,
  EMAIL_PURPOSE,
  QUOTA_STATUSES,
} from "./emailDeliveries";
import * as emailDeliveryRepository from "./emailDeliveryRepository";

export class QuotaExceededError extends Error {
  constructor(readonly quotaDate: string) {
    super(`The daily email send limit for ${quotaDate} has been reached.`);
    this.name = "QuotaExceededError";
  }
}

export class CooldownActiveError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("A verification email was sent to this address recently.");
    this.name = "CooldownActiveError";
  }
}

/** UTC date (YYYY-MM-DD) used as the quota bucket. */
export function getQuotaDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Seconds remaining until the next UTC midnight. */
export function secondsUntilQuotaReset(now = new Date()): number {
  const elapsed =
    now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  return 24 * 3600 - elapsed;
}

export function getDailySendLimit(): number {
  const raw = (process.env.RESEND_DAILY_SEND_LIMIT ?? "100").trim();
  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error("RESEND_DAILY_SEND_LIMIT must be a positive integer.");
  }

  return parsed;
}

const QUOTA_LOCK_NAMESPACE = "email_deliveries_quota";

export interface EmailDeliveryReservation {
  id: string;
  idempotencyKey: string;
  quotaDate: string;
}

/**
 * Reserves one daily quota slot inside a transaction serialized by a
 * PostgreSQL advisory lock, so concurrent sign-ups can never exceed the
 * configured daily limit.
 *
 * `cooldownMs`, when provided, rejects the reservation if the same email
 * already consumed a slot within the cooldown window.
 */
export async function reserveEmailDelivery({
  authPool,
  email,
  purpose = EMAIL_PURPOSE.EMAIL_VERIFICATION,
  provider = EMAIL_PROVIDER.RESEND,
  cooldownMs,
  now = new Date(),
}: {
  authPool: Pick<Pool, "connect">;
  email: string;
  purpose?: string;
  provider?: string;
  cooldownMs?: number;
  now?: Date;
}): Promise<EmailDeliveryReservation> {
  const quotaDate = getQuotaDate(now);
  const limit = getDailySendLimit();
  const id = randomUUID();
  const idempotencyKey = `${purpose}:${id}`;

  const client = await authPool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `${QUOTA_LOCK_NAMESPACE}:${quotaDate}`,
    ]);

    if (cooldownMs !== undefined) {
      const recent = await emailDeliveryRepository.findRecentDelivery(client, {
        email,
        since: new Date(now.getTime() - cooldownMs),
        statuses: QUOTA_STATUSES,
      });

      if (recent) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil(
            (recent.createdAt.getTime() + cooldownMs - now.getTime()) / 1000,
          ),
        );
        throw new CooldownActiveError(retryAfterSeconds);
      }
    }

    const usedSlots = await emailDeliveryRepository.countQuotaSlots(
      client,
      quotaDate,
    );

    if (usedSlots >= limit) {
      throw new QuotaExceededError(quotaDate);
    }

    await emailDeliveryRepository.insertReservedDelivery(client, {
      id,
      email,
      purpose,
      provider,
      quotaDate,
      idempotencyKey,
    });

    await client.query("COMMIT");
    return { id, idempotencyKey, quotaDate };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
