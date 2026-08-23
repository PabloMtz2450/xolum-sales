import "dotenv/config";
import { createHash, randomBytes, scryptSync } from "node:crypto";
import { PrismaClient, type MembershipRole } from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "XolumDemo!2026";
const PRIMARY_ORG = "org_demo_xolum";
const SECONDARY_ORG = "org_demo_norte";

function assertLocalSeedAllowed() {
  const url = process.env.DATABASE_URL ?? "";
  const localDatabase = /@(localhost|127\.0\.0\.1):|@postgres:|@xolum-sales-postgres:/i.test(url);
  if (process.env.NODE_ENV === "production" || process.env.XOLUM_ALLOW_DEMO_SEED !== "true" || !localDatabase) {
    throw new Error("DEMO_SEED_BLOCKED: sólo se permite en una base local con XOLUM_ALLOW_DEMO_SEED=true");
  }
}

function passwordHash(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$16384$8$1$${salt.toString("base64")}$${hash.toString("base64")}`;
}

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

async function seedUsers() {
  const roles: Array<{ role: MembershipRole; name: string; email: string }> = [
    { role: "OWNER", name: "JP Demo", email: "jp@demo.xolum.local" },
    { role: "ADMIN", name: "Andrea Administración", email: "admin@demo.xolum.local" },
    { role: "SALES_MANAGER", name: "Sofía Ventas", email: "ventas@demo.xolum.local" },
    { role: "SALES_REP", name: "Marco Ejecutivo", email: "ejecutivo@demo.xolum.local" },
    { role: "CREDIT", name: "Carla Crédito", email: "credito@demo.xolum.local" },
    { role: "INVENTORY", name: "Iván Inventarios", email: "inventario@demo.xolum.local" },
    { role: "AUDITOR", name: "Aurora Auditoría", email: "auditor@demo.xolum.local" },
    { role: "VIEWER", name: "Valeria Consulta", email: "consulta@demo.xolum.local" },
  ];

  for (const entry of roles) {
    const user = await prisma.user.upsert({
      where: { email: entry.email },
      update: { name: entry.name, passwordHash: passwordHash(DEMO_PASSWORD), mustChangePassword: false, disabledAt: null },
      create: { email: entry.email, name: entry.name, passwordHash: passwordHash(DEMO_PASSWORD), mustChangePassword: false },
    });
    await prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: PRIMARY_ORG, userId: user.id } },
      update: { role: entry.role }, create: { organizationId: PRIMARY_ORG, userId: user.id, role: entry.role },
    });
    const rawToken = `xolum_demo_${entry.role.toLowerCase()}_${"0".repeat(40)}`;
    await prisma.authSession.upsert({
      where: { tokenHash: tokenHash(rawToken) },
      update: { status: "ACTIVE", expiresAt: new Date("2030-12-31T23:59:59Z"), mfaVerifiedAt: new Date() },
      create: { organizationId: PRIMARY_ORG, userId: user.id, tokenHash: tokenHash(rawToken), expiresAt: new Date("2030-12-31T23:59:59Z"), mfaVerifiedAt: new Date(), status: "ACTIVE" },
    });
  }
  return roles;
}

async function main() {
  assertLocalSeedAllowed();
  await prisma.organization.upsert({ where: { id: PRIMARY_ORG }, update: { name: "XOLUM México Demo", slug: "xolum-mexico-demo" }, create: { id: PRIMARY_ORG, name: "XOLUM México Demo", slug: "xolum-mexico-demo" } });
  await prisma.organization.upsert({ where: { id: SECONDARY_ORG }, update: { name: "Distribuidora Norte Demo", slug: "distribuidora-norte-demo" }, create: { id: SECONDARY_ORG, name: "Distribuidora Norte Demo", slug: "distribuidora-norte-demo" } });
  const roles = await seedUsers();

  const customers = [
    { id: "cust_horizonte", code: "C-1001", legalName: "GRUPO HORIZONTE DEMO SA DE CV", tradeName: "Grupo Horizonte", rfc: "GHD260101AA1", cp: "03100", regime: "601", use: "G03", status: "ACTIVE" as const },
    { id: "cust_prisma", code: "C-1002", legalName: "OFICINAS PRISMA DEMO SA DE CV", tradeName: "Oficinas Prisma", rfc: "OPD260101BB2", cp: "64000", regime: "601", use: "G03", status: "ACTIVE" as const },
    { id: "cust_centro", code: "C-1003", legalName: "COMERCIAL DEL CENTRO DEMO SA DE CV", tradeName: "Comercial del Centro", rfc: "CCD260101CC3", cp: "44100", regime: "601", use: "G01", status: "REVIEW" as const },
    { id: "cust_nova", code: "C-1004", legalName: "SERVICIOS NOVA DEMO SC", tradeName: "Servicios Nova", rfc: "SND260101DD4", cp: "76000", regime: "601", use: "G03", status: "PROSPECT" as const },
  ];
  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      update: { legalName: customer.legalName, tradeName: customer.tradeName, status: customer.status },
      create: { id: customer.id, organizationId: PRIMARY_ORG, code: customer.code, legalName: customer.legalName, tradeName: customer.tradeName, rfc: customer.rfc, fiscalPostalCode: customer.cp, fiscalRegime: customer.regime, cfdiUse: customer.use, status: customer.status, paymentTermsDays: 30, creditLimit: "250000.00" },
    });
    await prisma.address.upsert({
      where: { id: `addr_${customer.id}` }, update: {},
      create: { id: `addr_${customer.id}`, customerId: customer.id, code: "ENT-01", type: "DELIVERY", label: "Entrega principal", street: "Avenida Demostración", exterior: "100", neighborhood: "Colonia Centro", postalCode: customer.cp, city: "Ciudad Demo", state: "MEX", country: "MEX", deliveryNotes: "Datos completamente ficticios para pruebas locales." },
    });
    await prisma.contact.upsert({ where: { id: `contact_${customer.id}` }, update: {}, create: { id: `contact_${customer.id}`, customerId: customer.id, name: `Contacto ${customer.tradeName}`, role: "Compras", email: `compras+${customer.code.toLowerCase()}@example.test`, phone: "5500000000", isPrimary: true } });
  }

  const products = [
    { id: "prod_papel", sku: "PAP-CARTA-500", name: "Papel carta 500 hojas", category: "Papelería", price: "118.00", tax: "0.160000", sat: "14111507", unit: "H87" },
    { id: "prod_carpeta", sku: "CARP-15-BLA", name: "Carpeta blanca 1.5 pulgadas", category: "Archivo", price: "76.50", tax: "0.160000", sat: "44122003", unit: "H87" },
    { id: "prod_toner", sku: "TON-NEG-X1", name: "Tóner negro alto rendimiento", category: "Consumibles", price: "1450.00", tax: "0.160000", sat: "44103103", unit: "H87" },
    { id: "prod_cafe", sku: "CAF-1KG", name: "Café tostado 1 kg", category: "Cafetería", price: "265.00", tax: "0.000000", sat: "50201706", unit: "KGM" },
    { id: "prod_limpieza", sku: "LIM-MULTI-5L", name: "Limpiador multiusos 5 L", category: "Limpieza", price: "189.00", tax: "0.160000", sat: "47131805", unit: "H87" },
  ];
  for (const product of products) await prisma.product.upsert({ where: { id: product.id }, update: { name: product.name }, create: { id: product.id, organizationId: PRIMARY_ORG, sku: product.sku, name: product.name, category: product.category, salesUnit: "PIEZA", satUnitCode: product.unit, satProductCode: product.sat, taxRate: product.tax, weightKg: "1.00", volumeM3: "0.002", active: true } });

  await prisma.warehouse.upsert({ where: { id: "wh_central" }, update: {}, create: { id: "wh_central", organizationId: PRIMARY_ORG, code: "CEDIS-01", name: "CEDIS Central Demo" } });
  for (let index = 0; index < products.length; index++) {
    const product = products[index];
    await prisma.stock.upsert({ where: { warehouseId_productId: { warehouseId: "wh_central", productId: product.id } }, update: { onHand: 500 - index * 55, reserved: 20 + index * 4, inTransit: 80 + index * 10 }, create: { warehouseId: "wh_central", productId: product.id, onHand: 500 - index * 55, reserved: 20 + index * 4, inTransit: 80 + index * 10 } });
    await prisma.inventoryMovement.upsert({ where: { id: `mov_${product.id}` }, update: {}, create: { id: `mov_${product.id}`, warehouseId: "wh_central", productId: product.id, type: "RECEIPT", quantity: 500 - index * 55, reference: "CARGA-DEMO" } });
  }

  await prisma.priceList.upsert({ where: { id: "price_general" }, update: {}, create: { id: "price_general", organizationId: PRIMARY_ORG, name: "Lista general demo", currency: "MXN", active: true } });
  for (const product of products) await prisma.priceListItem.upsert({ where: { id: `price_${product.id}` }, update: { unitPrice: product.price }, create: { id: `price_${product.id}`, priceListId: "price_general", productId: product.id, unitPrice: product.price, minQuantity: 1 } });

  const opportunities = [
    { id: "opp_1", customerId: "cust_horizonte", name: "Renovación anual de papelería", stage: "NEGOTIATION" as const, amount: "128450.00", probability: 70 },
    { id: "opp_2", customerId: "cust_prisma", name: "Suministro trimestral", stage: "QUOTED" as const, amount: "84120.00", probability: 55 },
    { id: "opp_3", customerId: "cust_centro", name: "Apertura de sucursales", stage: "QUALIFIED" as const, amount: "246900.00", probability: 35 },
  ];
  for (const opportunity of opportunities) await prisma.opportunity.upsert({ where: { id: opportunity.id }, update: { stage: opportunity.stage, amount: opportunity.amount }, create: { ...opportunity, organizationId: PRIMARY_ORG, expectedClose: new Date("2026-09-30") } });

  await prisma.quote.upsert({ where: { id: "quote_demo_1" }, update: {}, create: { id: "quote_demo_1", opportunityId: "opp_1", number: "COT-2026-001", version: 1, status: "SENT", total: "128450.00" } });
  await prisma.quoteLine.upsert({ where: { id: "quote_line_1" }, update: {}, create: { id: "quote_line_1", quoteId: "quote_demo_1", productId: "prod_papel", quantity: 500, unitPrice: "118.00", discount: 0 } });

  const orders = [
    { id: "order_1048", number: "XS-1048", customerId: "cust_horizonte", status: "VALIDATION" as const, total: "128450.00", productId: "prod_papel", quantity: "500", unitPrice: "118.00" },
    { id: "order_1047", number: "XS-1047", customerId: "cust_prisma", status: "CONFIRMED" as const, total: "84120.00", productId: "prod_toner", quantity: "40", unitPrice: "1450.00" },
    { id: "order_1046", number: "XS-1046", customerId: "cust_centro", status: "PREPARING" as const, total: "42680.00", productId: "prod_carpeta", quantity: "400", unitPrice: "76.50" },
  ];
  for (const order of orders) {
    await prisma.salesOrder.upsert({ where: { id: order.id }, update: { status: order.status }, create: { id: order.id, organizationId: PRIMARY_ORG, customerId: order.customerId, deliveryAddressId: `addr_${order.customerId}`, number: order.number, customerReference: `OC-DEMO-${order.number}`, status: order.status, currency: "MXN", total: order.total, promisedAt: new Date("2026-09-15"), tmsSyncStatus: "NOT_CONNECTED" } });
    await prisma.salesOrderLine.upsert({ where: { id: `line_${order.id}` }, update: {}, create: { id: `line_${order.id}`, orderId: order.id, productId: order.productId, quantity: order.quantity, unitPrice: order.unitPrice, discount: 0, customerPurchaseOrder: `OC-DEMO-${order.number}`, customerPoLine: "10", customerItemCode: `CLI-${order.productId}` } });
  }

  await prisma.invoicePreparation.upsert({
    where: { id: "invprep_demo_1047" }, update: {},
    create: { id: "invprep_demo_1047", organizationId: PRIMARY_ORG, customerId: "cust_prisma", salesOrderId: "order_1047", version: 1, status: "DRAFT", cfdiVersion: "4.0", voucherType: "I", series: "XS", currency: "MXN", paymentMethod: "PPD", paymentForm: "99", exportCode: "01", placeOfIssue: "03100", issuerSnapshot: { rfc: "XDE260101AA1", legalName: "XOLUM DEMO SA DE CV", fiscalRegime: "601" }, receiverSnapshot: { rfc: "OPD260101BB2", legalName: "OFICINAS PRISMA DEMO SA DE CV", fiscalPostalCode: "64000", fiscalRegime: "601", cfdiUse: "G03" }, subtotal: "58000.00", discount: 0, transferredTaxes: "9280.00", withheldTaxes: 0, total: "67280.00" },
  });
  await prisma.fiscalConcept.upsert({ where: { id: "concept_demo_1047" }, update: {}, create: { id: "concept_demo_1047", invoicePreparationId: "invprep_demo_1047", orderLineId: "line_order_1047", lineNumber: 1, productServiceCode: "44103103", internalSku: "TON-NEG-X1", quantity: 40, unitCode: "H87", unitName: "Pieza", description: "Tóner negro alto rendimiento", unitValue: "1450.00", amount: "58000.00", discount: 0, taxObjectCode: "02", customerPurchaseOrder: "OC-DEMO-XS-1047", customerPoLine: "10" } });
  await prisma.fiscalConceptTax.upsert({ where: { id: "tax_demo_1047" }, update: {}, create: { id: "tax_demo_1047", fiscalConceptId: "concept_demo_1047", direction: "TRANSFER", taxCode: "002", factorType: "Tasa", rateOrQuota: "0.160000", base: "58000.00", amount: "9280.00" } });

  const secondaryUser = await prisma.user.upsert({ where: { email: "admin@norte-demo.local" }, update: {}, create: { email: "admin@norte-demo.local", name: "Administrador Norte Demo", passwordHash: passwordHash(DEMO_PASSWORD), mustChangePassword: false } });
  await prisma.membership.upsert({ where: { organizationId_userId: { organizationId: SECONDARY_ORG, userId: secondaryUser.id } }, update: { role: "ADMIN" }, create: { organizationId: SECONDARY_ORG, userId: secondaryUser.id, role: "ADMIN" } });

  console.log("\nXOLUM Sales local listo. Todos los datos son ficticios.");
  console.table(roles.map(({ role, email }) => ({ rol: role, usuario: email, contraseña: DEMO_PASSWORD })));
  console.log("Empresa principal:", PRIMARY_ORG, "| Empresa de aislamiento:", SECONDARY_ORG);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
