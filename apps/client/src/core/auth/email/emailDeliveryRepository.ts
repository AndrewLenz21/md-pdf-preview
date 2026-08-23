import {
  EMAIL_DELIVERY_STATUS,
  QUOTA_STATUSES,
  statusRank,
  type EmailDeliveryStatus,
} from "./emailDeliveries";

export interface Queryable {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
}

export interface EmailDeliveryRow {
  id: string;
  userId: string | null;
  email: string;
  purpose: string;
  provider: string;
  providerMessageId: string | null;
  status: EmailDeliveryStatus;
  idempotencyKey: string;
  acceptedAt: Date | null;
  deliveredAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function countQuotaSlots(
  db: Queryable,
  quotaDate: string,
): Promise<number> {
  const result = await db.query(
    `SELECT COUNT(*)::int AS "count"
     FROM email_deliveries
     WHERE "quota_date" = $1 AND "status" = ANY($2)`,
    [quotaDate, QUOTA_STATUSES],
  );

  const row = result.rows[0] as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

export async function insertReservedDelivery(
  db: Queryable,
  input: {
    id: string;
    email: string;
    purpose: string;
    provider: string;
    quotaDate: string;
    idempotencyKey: string;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO email_deliveries
       ("id", "email", "purpose", "provider", "status", "quota_date", "idempotency_key")
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.id,
      input.email,
      input.purpose,
      input.provider,
      EMAIL_DELIVERY_STATUS.RESERVED,
      input.quotaDate,
      input.idempotencyKey,
    ],
  );
}

export async function getDeliveryById(
  db: Queryable,
  id: string,
): Promise<EmailDeliveryRow | undefined> {
  const result = await db.query(
    `SELECT "id",
            "user_id" AS "userId",
            "email",
            "purpose",
            "provider",
            "provider_message_id" AS "providerMessageId",
            "status",
            "idempotency_key" AS "idempotencyKey",
            "accepted_at" AS "acceptedAt",
            "delivered_at" AS "deliveredAt",
            "error_code" AS "errorCode",
            "error_message" AS "errorMessage",
            "created_at" AS "createdAt",
            "updated_at" AS "updatedAt"
     FROM email_deliveries
     WHERE "id" = $1
     LIMIT 1`,
    [id],
  );

  return result.rows[0] as EmailDeliveryRow | undefined;
}

export async function getDeliveryStatus(
  db: Queryable,
  id: string,
): Promise<EmailDeliveryStatus | undefined> {
  const result = await db.query(
    `SELECT "status" FROM email_deliveries WHERE "id" = $1 LIMIT 1`,
    [id],
  );

  const row = result.rows[0] as { status: EmailDeliveryStatus } | undefined;
  return row?.status;
}

export async function markAccepted(
  db: Queryable,
  input: {
    id: string;
    providerMessageId: string;
    userId: string | null;
  },
): Promise<void> {
  await db.query(
    `UPDATE email_deliveries
     SET "status" = $2,
         "provider_message_id" = $3,
         "user_id" = $4,
         "accepted_at" = CURRENT_TIMESTAMP,
         "updated_at" = CURRENT_TIMESTAMP
     WHERE "id" = $1 AND "status" = $5`,
    [
      input.id,
      EMAIL_DELIVERY_STATUS.ACCEPTED,
      input.providerMessageId,
      input.userId,
      EMAIL_DELIVERY_STATUS.RESERVED,
    ],
  );
}

export async function markRequestFailed(
  db: Queryable,
  input: {
    id: string;
    errorCode: string | null;
    errorMessage: string | null;
  },
): Promise<void> {
  await db.query(
    `UPDATE email_deliveries
     SET "status" = $2,
         "error_code" = $3,
         "error_message" = $4,
         "updated_at" = CURRENT_TIMESTAMP
     WHERE "id" = $1 AND "status" = $5`,
    [
      input.id,
      EMAIL_DELIVERY_STATUS.REQUEST_FAILED,
      input.errorCode,
      input.errorMessage,
      EMAIL_DELIVERY_STATUS.RESERVED,
    ],
  );
}

export async function cancelIfReserved(
  db: Queryable,
  id: string,
): Promise<void> {
  await db.query(
    `UPDATE email_deliveries
     SET "status" = $2, "updated_at" = CURRENT_TIMESTAMP
     WHERE "id" = $1 AND "status" = $3`,
    [id, EMAIL_DELIVERY_STATUS.CANCELLED, EMAIL_DELIVERY_STATUS.RESERVED],
  );
}

export type WebhookUpdateResult = "updated" | "skipped" | "missing";

export async function applyWebhookStatus(
  db: Queryable,
  input: {
    providerMessageId: string;
    status: EmailDeliveryStatus;
    deliveredAt?: Date;
  },
): Promise<WebhookUpdateResult> {
  const current = await db.query(
    `SELECT "status" FROM email_deliveries WHERE "provider_message_id" = $1 LIMIT 1`,
    [input.providerMessageId],
  );

  const currentStatus = (current.rows[0] as
    | { status: EmailDeliveryStatus }
    | undefined)?.status;

  if (!currentStatus) {
    return "missing";
  }

  if (statusRank(input.status) < statusRank(currentStatus)) {
    return "skipped";
  }

  await db.query(
    `UPDATE email_deliveries
     SET "status" = $2,
         "delivered_at" = COALESCE($3, "delivered_at"),
         "updated_at" = CURRENT_TIMESTAMP
     WHERE "provider_message_id" = $1`,
    [input.providerMessageId, input.status, input.deliveredAt ?? null],
  );

  return "updated";
}

export async function findRecentDelivery(
  db: Queryable,
  input: {
    email: string;
    since: Date;
    statuses: EmailDeliveryStatus[];
  },
): Promise<
  | { id: string; email: string; status: EmailDeliveryStatus; createdAt: Date }
  | undefined
> {
  const result = await db.query(
    `SELECT "id", "email", "status", "created_at" AS "createdAt"
     FROM email_deliveries
     WHERE "email" = $1 AND "created_at" >= $2 AND "status" = ANY($3)
     ORDER BY "created_at" DESC
     LIMIT 1`,
    [input.email, input.since, input.statuses],
  );

  return result.rows[0] as
    | { id: string; email: string; status: EmailDeliveryStatus; createdAt: Date }
    | undefined;
}

/**
 * Removes the auth user row created during sign-up when the verification
 * email never reached the provider. Sessions and accounts cascade.
 */
export async function deleteAuthUser(
  db: Queryable,
  userId: string,
): Promise<void> {
  await db.query(`DELETE FROM "user" WHERE "id" = $1`, [userId]);
}
