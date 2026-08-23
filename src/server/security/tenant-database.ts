import "server-only";
import type { SecurityContext } from "./authorization";

export interface TenantTransactionClient {
  executeRaw(query: string, ...parameters: unknown[]): Promise<unknown>;
}

export async function bindTenantToTransaction(client: TenantTransactionClient, context: SecurityContext) {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(context.organizationId)) throw new Error("TENANT_ID_INVALID");
  await client.executeRaw("SELECT set_config('app.organization_id', $1, true)", context.organizationId);
}

export async function clearTenantFromTransaction(client: TenantTransactionClient) {
  await client.executeRaw("SELECT set_config('app.organization_id', '', true)");
}
