import "server-only";
import { createHash } from "node:crypto";

export function computeAuditHash(input: { previousHash?: string; organizationId: string; action: string; resourceId: string; correlationId: string; payloadHash?: string; createdAt: string }) {
  return createHash("sha256").update([
    input.previousHash ?? "GENESIS", input.organizationId, input.action, input.resourceId,
    input.correlationId, input.payloadHash ?? "", input.createdAt,
  ].join("|")).digest("hex");
}
