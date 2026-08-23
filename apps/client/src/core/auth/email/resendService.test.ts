import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const emailsSendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: emailsSendMock };
  },
}));

vi.mock("../pool", () => ({
  requiredEnvironmentVariable: (name: string) => {
    if (name === "RESEND_API_KEY") {
      return "test-api-key";
    }
    if (name === "RESEND_EMAIL_FROM") {
      return "no-reply@example.com";
    }
    throw new Error(`${name} must be configured.`);
  },
}));

describe("resendService", () => {
  let service: typeof import("./resendService");

  beforeEach(async () => {
    vi.resetModules();
    emailsSendMock.mockReset();
    service = await import("./resendService");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const input = {
    to: "user@example.com",
    name: "Ana",
    locale: "es" as const,
    verificationUrl: "https://example.com/api/auth/verify-email?token=abc",
    idempotencyKey: "email_verification:delivery-1",
  };

  it("returns the provider message id on success", async () => {
    emailsSendMock.mockResolvedValue({
      data: { id: "resend-msg-1" },
      error: null,
    });

    const result = await service.sendVerificationEmail(input);

    expect(result).toEqual({ providerMessageId: "resend-msg-1" });
    expect(emailsSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "no-reply@example.com",
        to: ["user@example.com"],
      }),
      { idempotencyKey: input.idempotencyKey },
    );
  });

  it("does not retry provider rejections (4xx)", async () => {
    emailsSendMock.mockResolvedValue({
      data: null,
      error: {
        message: "Invalid from address",
        statusCode: 403,
        name: "invalid_from_address",
      },
    });

    await expect(service.sendVerificationEmail(input)).rejects.toMatchObject({
      name: "ResendSendError",
      statusCode: 403,
    });

    expect(emailsSendMock).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures once with the same idempotency key", async () => {
    emailsSendMock
      .mockResolvedValueOnce({
        data: null,
        error: { message: "boom", statusCode: 500, name: "application_error" },
      })
      .mockResolvedValueOnce({
        data: { id: "resend-msg-2" },
        error: null,
      });

    const result = await service.sendVerificationEmail(input);

    expect(result).toEqual({ providerMessageId: "resend-msg-2" });
    expect(emailsSendMock).toHaveBeenCalledTimes(2);
    expect(emailsSendMock.mock.calls[0][1]).toEqual(
      emailsSendMock.mock.calls[1][1],
    );
  });

  it("retries network failures with the same idempotency key", async () => {
    emailsSendMock
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce({ data: { id: "resend-msg-3" }, error: null });

    const result = await service.sendVerificationEmail(input);

    expect(result).toEqual({ providerMessageId: "resend-msg-3" });
    expect(emailsSendMock).toHaveBeenCalledTimes(2);
  });

  it("throws the last error when retries are exhausted", async () => {
    emailsSendMock.mockResolvedValue({
      data: null,
      error: { message: "boom", statusCode: 500, name: "application_error" },
    });

    await expect(service.sendVerificationEmail(input)).rejects.toMatchObject({
      name: "ResendSendError",
    });
    expect(emailsSendMock).toHaveBeenCalledTimes(2);
  });
});
