import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const connectMock = vi.fn();

vi.mock("../pool", () => ({
  authPool: { connect: connectMock },
}));

vi.mock("./emailDeliveryRepository", () => ({
  countQuotaSlots: vi.fn(),
  findRecentDelivery: vi.fn(),
  insertReservedDelivery: vi.fn(),
}));

describe("emailQuota", () => {
  let quota: typeof import("./emailQuota");
  let repository: typeof import("./emailDeliveryRepository");

  const fakeClient = {
    query: queryMock,
    release: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetModules();
    process.env.RESEND_DAILY_SEND_LIMIT = "100";

    connectMock.mockResolvedValue(fakeClient);
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [] });
    fakeClient.release.mockReset();

    quota = await import("./emailQuota");
    repository = await import("./emailDeliveryRepository");

    const insertMock = vi.mocked(repository.insertReservedDelivery);
    insertMock.mockReset();
    insertMock.mockResolvedValue(undefined);

    const recentMock = vi.mocked(repository.findRecentDelivery);
    recentMock.mockReset();
    recentMock.mockResolvedValue(undefined);

    const countMock = vi.mocked(repository.countQuotaSlots);
    countMock.mockReset();
    countMock.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.RESEND_DAILY_SEND_LIMIT;
  });

  describe("getQuotaDate", () => {
    it("returns the UTC date of the given instant", () => {
      expect(quota.getQuotaDate(new Date("2026-08-23T23:59:59Z"))).toBe(
        "2026-08-23",
      );
      expect(quota.getQuotaDate(new Date("2026-08-24T00:00:00Z"))).toBe(
        "2026-08-24",
      );
    });
  });

  describe("secondsUntilQuotaReset", () => {
    it("returns seconds until the next UTC midnight", () => {
      expect(quota.secondsUntilQuotaReset(new Date("2026-08-23T00:00:00Z"))).toBe(
        24 * 3600,
      );
      expect(quota.secondsUntilQuotaReset(new Date("2026-08-23T23:59:59Z"))).toBe(
        1,
      );
    });
  });

  describe("getDailySendLimit", () => {
    it("defaults to 100", () => {
      delete process.env.RESEND_DAILY_SEND_LIMIT;
      expect(quota.getDailySendLimit()).toBe(100);
    });

    it("reads RESEND_DAILY_SEND_LIMIT", () => {
      process.env.RESEND_DAILY_SEND_LIMIT = "42";
      expect(quota.getDailySendLimit()).toBe(42);
    });

    it("rejects non-positive limits", () => {
      process.env.RESEND_DAILY_SEND_LIMIT = "0";
      expect(() => quota.getDailySendLimit()).toThrow();
    });
  });

  describe("reserveEmailDelivery", () => {
    it("rejects the 101st slot and rolls back without inserting", async () => {
      vi.mocked(repository.countQuotaSlots).mockResolvedValue(100);

      await expect(
        quota.reserveEmailDelivery({ email: "user@example.com" }),
      ).rejects.toBeInstanceOf(quota.QuotaExceededError);

      expect(repository.insertReservedDelivery).not.toHaveBeenCalled();
      expect(queryMock).toHaveBeenCalledWith("ROLLBACK");
      expect(fakeClient.release).toHaveBeenCalled();
    });

    it("reserves the 100th slot when 99 are used", async () => {
      vi.mocked(repository.countQuotaSlots).mockResolvedValue(99);

      const reservation = await quota.reserveEmailDelivery({
        email: "user@example.com",
      });

      expect(reservation.id).toBeTruthy();
      expect(reservation.idempotencyKey).toBe(
        `email_verification:${reservation.id}`,
      );
      expect(reservation.quotaDate).toBe(
        quota.getQuotaDate(new Date()),
      );

      expect(repository.insertReservedDelivery).toHaveBeenCalledWith(
        fakeClient,
        expect.objectContaining({
          id: reservation.id,
          email: "user@example.com",
          quotaDate: reservation.quotaDate,
          idempotencyKey: reservation.idempotencyKey,
        }),
      );
      expect(queryMock).toHaveBeenCalledWith("COMMIT");
      expect(fakeClient.release).toHaveBeenCalled();
    });

    it("serializes reservations with an advisory lock", async () => {
      vi.mocked(repository.countQuotaSlots).mockResolvedValue(0);

      await quota.reserveEmailDelivery({ email: "user@example.com" });

      expect(queryMock).toHaveBeenCalledWith(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        [expect.stringMatching(/^email_deliveries_quota:\d{4}-\d{2}-\d{2}$/)],
      );
    });

    it("rejects the reservation when the email is within the cooldown", async () => {
      vi.mocked(repository.countQuotaSlots).mockResolvedValue(0);
      vi.mocked(repository.findRecentDelivery).mockResolvedValue({
        id: "delivery-1",
        email: "user@example.com",
        status: "accepted",
        createdAt: new Date(Date.now() - 60 * 1000),
      });

      await expect(
        quota.reserveEmailDelivery({
          email: "user@example.com",
          cooldownMs: 5 * 60 * 1000,
        }),
      ).rejects.toBeInstanceOf(quota.CooldownActiveError);

      expect(repository.insertReservedDelivery).not.toHaveBeenCalled();
      expect(queryMock).toHaveBeenCalledWith("ROLLBACK");
    });
  });
});
