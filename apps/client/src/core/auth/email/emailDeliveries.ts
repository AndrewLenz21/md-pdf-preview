export const EMAIL_DELIVERY_STATUS = {
  RESERVED: "reserved",
  ACCEPTED: "accepted",
  DELIVERED: "delivered",
  BOUNCED: "bounced",
  FAILED: "failed",
  SUPPRESSED: "suppressed",
  REQUEST_FAILED: "request_failed",
  CANCELLED: "cancelled",
} as const;

export type EmailDeliveryStatus =
  (typeof EMAIL_DELIVERY_STATUS)[keyof typeof EMAIL_DELIVERY_STATUS];

export const EMAIL_PURPOSE = {
  EMAIL_VERIFICATION: "email_verification",
  ACCOUNT_DELETION: "account_deletion",
} as const;

export const EMAIL_PROVIDER = {
  RESEND: "resend",
} as const;

/**
 * Statuses that occupy a quota slot. `request_failed` and `cancelled` free
 * their slot and are never counted.
 */
export const QUOTA_STATUSES: EmailDeliveryStatus[] = [
  EMAIL_DELIVERY_STATUS.RESERVED,
  EMAIL_DELIVERY_STATUS.ACCEPTED,
  EMAIL_DELIVERY_STATUS.DELIVERED,
  EMAIL_DELIVERY_STATUS.BOUNCED,
  EMAIL_DELIVERY_STATUS.FAILED,
  EMAIL_DELIVERY_STATUS.SUPPRESSED,
];

/**
 * Monotonic rank used to make webhook updates idempotent: a provider event
 * never downgrades an already-terminal delivery state.
 */
const EMAIL_DELIVERY_STATUS_RANK: Record<EmailDeliveryStatus, number> = {
  reserved: 0,
  accepted: 1,
  delivered: 2,
  bounced: 3,
  failed: 3,
  suppressed: 3,
  request_failed: 3,
  cancelled: 3,
};

export function statusRank(status: EmailDeliveryStatus): number {
  return EMAIL_DELIVERY_STATUS_RANK[status] ?? 3;
}

/** Maps Resend webhook event types to email delivery statuses. */
export const WEBHOOK_EVENT_STATUS: Record<string, EmailDeliveryStatus> = {
  "email.delivered": EMAIL_DELIVERY_STATUS.DELIVERED,
  "email.bounced": EMAIL_DELIVERY_STATUS.BOUNCED,
  "email.failed": EMAIL_DELIVERY_STATUS.FAILED,
  "email.suppressed": EMAIL_DELIVERY_STATUS.SUPPRESSED,
};

export const EMAIL_ATTEMPT_ID_HEADER = "x-email-attempt-id";
export const EMAIL_ATTEMPT_KIND_HEADER = "x-email-attempt-kind";

export type EmailAttemptKind = "sign-up" | "resend";
