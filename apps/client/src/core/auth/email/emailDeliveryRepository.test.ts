import { describe, expect, it, vi } from "vitest";

import {
  EMAIL_DELIVERY_STATUS,
} from "./emailDeliveries";
import * as repository from "./emailDeliveryRepository";

type FakeQueryable = {
  query: ReturnType<
    typeof vi.fn<(text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>>
  >;
};

function createQueryable(rows: unknown[]): FakeQueryable {
  return {
    query: vi
      .fn<(text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>>()
      .mockResolvedValue({ rows }),
  };
}

describe("emailDeliveryRepository", () => {
  it("marks a reserved delivery as accepted", async () => {
    const db = createQueryable([]);

    await repository.markAccepted(db, {
      id: "delivery-1",
      providerMessageId: "resend-msg-1",
      userId: "user-1",
    });

    expect(db.query).toHaveBeenCalledTimes(1);

    const [sql, values] = db.query.mock.calls[0];
    expect(sql).toContain('"status" = $2');
    expect(sql).toContain('"provider_message_id" = $3');
    expect(values).toContain("accepted");
    expect(values).toContain("reserved");
  });

  it("only cancels deliveries that are still reserved", async () => {
    const db = createQueryable([]);

    await repository.cancelIfReserved(db, "delivery-1");

    const [sql, values] = db.query.mock.calls[0];
    expect(sql).toContain('WHERE "id" = $1 AND "status" = $3');
    expect(values).toContain("cancelled");
    expect(values).toContain("reserved");
  });

  it("counts only quota-consuming statuses for the given date", async () => {
    const db = createQueryable([{ count: 7 }]);

    const count = await repository.countQuotaSlots(db, "2026-08-23");

    expect(count).toBe(7);

    const [sql, values = []] = db.query.mock.calls[0];
    expect(sql).toContain('"quota_date" = $1');
    expect(values[0]).toBe("2026-08-23");
  });

  describe("applyWebhookStatus", () => {
    it("updates a delivery when the event advances its state", async () => {
      const db = createQueryable([{ status: EMAIL_DELIVERY_STATUS.ACCEPTED }]);

      const result = await repository.applyWebhookStatus(db, {
        providerMessageId: "resend-msg-1",
        status: EMAIL_DELIVERY_STATUS.DELIVERED,
        deliveredAt: new Date("2026-08-23T12:00:00Z"),
      });

      expect(result).toBe("updated");
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it("never downgrades a terminal delivery state", async () => {
      const db = createQueryable([{ status: EMAIL_DELIVERY_STATUS.DELIVERED }]);

      const result = await repository.applyWebhookStatus(db, {
        providerMessageId: "resend-msg-1",
        status: EMAIL_DELIVERY_STATUS.ACCEPTED,
      });

      expect(result).toBe("skipped");
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it("reports missing deliveries without inserting rows", async () => {
      const db = createQueryable([]);

      const result = await repository.applyWebhookStatus(db, {
        providerMessageId: "resend-msg-1",
        status: EMAIL_DELIVERY_STATUS.DELIVERED,
      });

      expect(result).toBe("missing");
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  it("deletes the auth user row so sign-up rollbacks cascade", async () => {
    const db = createQueryable([]);

    await repository.deleteAuthUser(db, "user-1");

    const [sql, values] = db.query.mock.calls[0];
    expect(sql).toContain('DELETE FROM "user"');
    expect(values).toEqual(["user-1"]);
  });
});
