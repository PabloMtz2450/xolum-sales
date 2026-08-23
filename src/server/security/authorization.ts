import "server-only";

export type Role = "OWNER" | "ADMIN" | "SALES_MANAGER" | "SALES_REP" | "CREDIT" | "INVENTORY" | "AUDITOR" | "VIEWER";
export type Permission =
  | "customer:read" | "customer:write" | "order:read" | "order:write" | "order:approve"
  | "inventory:read" | "inventory:write" | "fiscal:read" | "fiscal:prepare"
  | "fiscal:stamp" | "fiscal:cancel" | "security:admin" | "audit:read";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: ["customer:read","customer:write","order:read","order:write","order:approve","inventory:read","inventory:write","fiscal:read","fiscal:prepare","fiscal:stamp","fiscal:cancel","security:admin","audit:read"],
  ADMIN: ["customer:read","customer:write","order:read","order:write","order:approve","inventory:read","inventory:write","fiscal:read","fiscal:prepare","fiscal:stamp","fiscal:cancel","security:admin","audit:read"],
  SALES_MANAGER: ["customer:read","customer:write","order:read","order:write","order:approve","inventory:read","fiscal:read","fiscal:prepare"],
  SALES_REP: ["customer:read","customer:write","order:read","order:write","inventory:read","fiscal:read","fiscal:prepare"],
  CREDIT: ["customer:read","customer:write","order:read","order:approve","fiscal:read","fiscal:prepare","fiscal:stamp","fiscal:cancel"],
  INVENTORY: ["customer:read","order:read","inventory:read","inventory:write"],
  AUDITOR: ["customer:read","order:read","inventory:read","fiscal:read","audit:read"],
  VIEWER: ["customer:read","order:read","inventory:read","fiscal:read"],
};

export type SecurityContext = {
  sessionId: string;
  userId: string;
  organizationId: string;
  role: Role;
  mfaVerified: boolean;
  expiresAt: Date;
};

const MFA_REQUIRED = new Set<Permission>(["fiscal:stamp","fiscal:cancel","security:admin"]);

export function assertAuthorized(context: SecurityContext, permission: Permission, requestedOrganizationId: string) {
  if (context.expiresAt.getTime() <= Date.now()) throw new Error("AUTH_SESSION_EXPIRED");
  if (context.organizationId !== requestedOrganizationId) throw new Error("TENANT_ACCESS_DENIED");
  if (!ROLE_PERMISSIONS[context.role].includes(permission)) throw new Error("RBAC_ACCESS_DENIED");
  if (MFA_REQUIRED.has(permission) && !context.mfaVerified) throw new Error("MFA_REQUIRED");
}

export function tenantWhere<T extends Record<string, unknown>>(context: SecurityContext, where?: T): T & { organizationId: string } {
  return { ...(where ?? {} as T), organizationId: context.organizationId };
}

export function assertSameTenant(context: SecurityContext, ...organizationIds: string[]) {
  if (organizationIds.some(id => id !== context.organizationId)) throw new Error("TENANT_RELATION_MISMATCH");
}
