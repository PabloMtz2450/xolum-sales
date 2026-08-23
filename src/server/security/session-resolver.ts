import "server-only";
import { hashSecret } from "./session";
import type { Role, SecurityContext } from "./authorization";

export type PersistedSession = {
  id: string;
  userId: string;
  organizationId: string;
  role: Role;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  expiresAt: Date;
  mfaVerifiedAt: Date | null;
};

export interface SessionRepository {
  findByTokenHash(tokenHash: string): Promise<PersistedSession | null>;
  touch(sessionId: string, at: Date): Promise<void>;
  expire(sessionId: string, at: Date): Promise<void>;
}

export class SessionResolver {
  constructor(private readonly repository: SessionRepository, private readonly mfaMaxAgeMs = 15 * 60_000) {}

  async resolve(rawToken: string | undefined, now = new Date()): Promise<SecurityContext> {
    if (!rawToken || rawToken.length < 32 || rawToken.length > 128) throw new Error("AUTH_SESSION_REQUIRED");
    const session = await this.repository.findByTokenHash(hashSecret(rawToken));
    if (!session || session.status !== "ACTIVE") throw new Error("AUTH_SESSION_INVALID");
    if (session.expiresAt.getTime() <= now.getTime()) {
      await this.repository.expire(session.id, now);
      throw new Error("AUTH_SESSION_EXPIRED");
    }
    await this.repository.touch(session.id, now);
    const mfaVerified = Boolean(session.mfaVerifiedAt && now.getTime() - session.mfaVerifiedAt.getTime() <= this.mfaMaxAgeMs);
    return { sessionId: session.id, userId: session.userId, organizationId: session.organizationId, role: session.role, expiresAt: session.expiresAt, mfaVerified };
  }
}
