import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
const databaseUrl = process.env.DATABASE_URL ?? "";
checks.push({ name: "Node.js", ok: Number(process.versions.node.split(".")[0]) >= 22, detail: process.versions.node });
checks.push({ name: "DATABASE_URL", ok: Boolean(databaseUrl), detail: databaseUrl ? "configurada" : "faltante" });
checks.push({ name: "Base local", ok: /@(localhost|127\.0\.0\.1):|@postgres:|@xolum-sales-postgres:/i.test(databaseUrl), detail: "debe apuntar sólo a PostgreSQL local" });
checks.push({ name: "Seed demo", ok: process.env.XOLUM_ALLOW_DEMO_SEED === "true", detail: process.env.XOLUM_ALLOW_DEMO_SEED ?? "faltante" });
checks.push({ name: "PAC seguro", ok: process.env.PAC_ENVIRONMENT !== "PRODUCTION", detail: process.env.PAC_ENVIRONMENT ?? "sin configurar" });

if (checks.every(check => check.ok)) {
  const prisma = new PrismaClient();
  try {
    const [organizations, users, customers, products, orders] = await Promise.all([
      prisma.organization.count(), prisma.user.count(), prisma.customer.count(), prisma.product.count(), prisma.salesOrder.count(),
    ]);
    checks.push({ name: "PostgreSQL", ok: true, detail: `${organizations} empresas · ${users} usuarios · ${customers} clientes · ${products} productos · ${orders} pedidos` });
  } catch (error) {
    checks.push({ name: "PostgreSQL", ok: false, detail: error instanceof Error ? error.message.split("\n")[0] : "sin conexión" });
  } finally {
    await prisma.$disconnect();
  }
}

console.table(checks.map(check => ({ estado: check.ok ? "OK" : "FALTA", revisión: check.name, detalle: check.detail })));
if (checks.some(check => !check.ok)) process.exitCode = 1;
