import { describe, expect, it, vi } from "vitest";
import { SessionResolver } from "./session-resolver";

describe("SessionResolver", () => {
  it("expires a stale persisted session", async () => {
    const repository = {
      findByTokenHash: vi.fn().mockResolvedValue({ id: "s1", userId: "u1", organizationId: "org12345", role: "ADMIN", status: "ACTIVE", expiresAt: new Date("2026-01-01"), mfaVerifiedAt: null }),
      touch: vi.fn(), expire: vi.fn(),
    };
    await expect(new SessionResolver(repository).resolve("a".repeat(43), new Date("2026-08-22"))).rejects.toThrow(/EXPIRED/);
    expect(repository.expire).toHaveBeenCalledOnce();
  });

  it("derives recent MFA from persisted time, not request input", async () => {
    const now = new Date("2026-08-22T12:00:00Z");
    const repository = {
      findByTokenHash: vi.fn().mockResolvedValue({ id: "s1", userId: "u1", organizationId: "org12345", role: "ADMIN", status: "ACTIVE", expiresAt: new Date("2026-08-23"), mfaVerifiedAt: new Date("2026-08-22T11:55:00Z") }),
      touch: vi.fn(), expire: vi.fn(),
    };
    await expect(new SessionResolver(repository).resolve("a".repeat(43), now)).resolves.toMatchObject({ mfaVerified: true, organizationId: "org12345" });
  });
});
