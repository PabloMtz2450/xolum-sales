-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'SALES_MANAGER', 'SALES_REP', 'CREDIT', 'INVENTORY', 'AUDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."CustomerStatus" AS ENUM ('PROSPECT', 'REVIEW', 'ACTIVE', 'BLOCKED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."OpportunityStage" AS ENUM ('PROSPECT', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'NEGOTIATION', 'APPROVAL', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('DRAFT', 'VALIDATION', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AddressType" AS ENUM ('FISCAL', 'BILLING', 'BRANCH', 'WAREHOUSE', 'DELIVERY', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "public"."InventoryMovementType" AS ENUM ('RECEIPT', 'RESERVATION', 'RELEASE', 'SHIPMENT', 'ADJUSTMENT', 'TRANSFER');

-- CreateEnum
CREATE TYPE "public"."SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."FiscalProcessStatus" AS ENUM ('DRAFT', 'VALIDATING', 'READY', 'STAMPING', 'STAMPED', 'REJECTED', 'UNCERTAIN', 'CANCEL_PENDING', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."ArtifactType" AS ENUM ('PRECFDI', 'STAMPED_XML', 'PDF', 'CANCELLATION_ACK', 'PAC_REQUEST', 'PAC_RESPONSE', 'ORIGINAL_STRING');

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Membership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."MembershipRole" NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "rfc" TEXT,
    "fiscalPostalCode" TEXT,
    "fiscalRegime" TEXT,
    "cfdiUse" TEXT,
    "status" "public"."CustomerStatus" NOT NULL DEFAULT 'PROSPECT',
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 0,
    "creditLimit" DECIMAL(65,30),
    "creditHold" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Address" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "public"."AddressType" NOT NULL,
    "label" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "exterior" TEXT,
    "interior" TEXT,
    "neighborhood" TEXT,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'MEX',
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "deliveryNotes" TEXT,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Opportunity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" "public"."OpportunityStage" NOT NULL DEFAULT 'PROSPECT',
    "amount" DECIMAL(65,30),
    "probability" INTEGER,
    "expectedClose" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "category" TEXT,
    "gtin" TEXT,
    "salesUnit" TEXT NOT NULL,
    "satUnitCode" TEXT,
    "satProductCode" TEXT,
    "taxRate" DECIMAL(65,30),
    "weightKg" DECIMAL(65,30),
    "volumeM3" DECIMAL(65,30),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Warehouse" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Stock" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "onHand" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "inTransit" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryMovement" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "public"."InventoryMovementType" NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PriceList" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PriceListItem" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "minQuantity" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),

    CONSTRAINT "PriceListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Quote" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "total" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuoteLine" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalesOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "deliveryAddressId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerReference" TEXT,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "total" DECIMAL(65,30) NOT NULL,
    "promisedAt" TIMESTAMP(3),
    "tmsShipmentId" TEXT,
    "tmsSyncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalesOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "customerPurchaseOrder" TEXT,
    "customerPoLine" TEXT,
    "customerItemCode" TEXT,

    CONSTRAINT "SalesOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoicePreparation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "public"."FiscalProcessStatus" NOT NULL DEFAULT 'DRAFT',
    "cfdiVersion" TEXT NOT NULL DEFAULT '4.0',
    "voucherType" TEXT NOT NULL DEFAULT 'I',
    "series" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "exchangeRate" DECIMAL(65,30),
    "paymentMethod" TEXT NOT NULL,
    "paymentForm" TEXT,
    "exportCode" TEXT NOT NULL DEFAULT '01',
    "placeOfIssue" TEXT NOT NULL,
    "issuerSnapshot" JSONB NOT NULL,
    "receiverSnapshot" JSONB NOT NULL,
    "globalInformation" JSONB,
    "relatedCfdis" JSONB,
    "complementCode" TEXT,
    "complementVersion" TEXT,
    "complementPayload" JSONB,
    "addendaRequired" BOOLEAN NOT NULL DEFAULT false,
    "addendaCode" TEXT,
    "addendaPayload" JSONB,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "transferredTaxes" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "withheldTaxes" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "payloadHash" TEXT,
    "signedXmlSha256" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "validationErrors" JSONB,
    "fiscalDocumentId" TEXT,
    "fiscalSyncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoicePreparation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FiscalConcept" (
    "id" TEXT NOT NULL,
    "invoicePreparationId" TEXT NOT NULL,
    "orderLineId" TEXT,
    "lineNumber" INTEGER NOT NULL,
    "productServiceCode" TEXT NOT NULL,
    "internalSku" TEXT,
    "customerItemCode" TEXT,
    "gtin" TEXT,
    "identificationNumber" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitCode" TEXT NOT NULL,
    "unitName" TEXT,
    "description" TEXT NOT NULL,
    "unitValue" DECIMAL(65,30) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxObjectCode" TEXT NOT NULL,
    "customerPurchaseOrder" TEXT,
    "customerPoLine" TEXT,
    "customsInformation" JSONB,
    "propertyAccount" TEXT,
    "thirdPartyAccount" JSONB,

    CONSTRAINT "FiscalConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FiscalConceptTax" (
    "id" TEXT NOT NULL,
    "fiscalConceptId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "taxCode" TEXT NOT NULL,
    "factorType" TEXT NOT NULL,
    "rateOrQuota" DECIMAL(65,30),
    "base" DECIMAL(65,30) NOT NULL,
    "amount" DECIMAL(65,30),

    CONSTRAINT "FiscalConceptTax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FiscalSchemaCatalog" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "xsdUrl" TEXT NOT NULL,
    "xsltUrl" TEXT,
    "activeFrom" TIMESTAMP(3),
    "activeTo" TIMESTAMP(3),
    "sha256" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalSchemaCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IntegrationDelivery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "payloadHash" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "public"."SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "mfaVerifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseHash" TEXT,
    "status" TEXT NOT NULL,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "payloadHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FiscalArtifact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoicePreparationId" TEXT NOT NULL,
    "type" "public"."ArtifactType" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "byteLength" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "encryptionKeyId" TEXT,
    "immutableUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FiscalStampAttempt" (
    "id" TEXT NOT NULL,
    "invoicePreparationId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestSha256" TEXT NOT NULL,
    "responseSha256" TEXT,
    "pac" TEXT NOT NULL DEFAULT 'FINKOK',
    "environment" TEXT NOT NULL,
    "status" "public"."FiscalProcessStatus" NOT NULL,
    "pacCode" TEXT,
    "pacMessage" TEXT,
    "uuid" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "FiscalStampAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "public"."Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_organizationId_userId_key" ON "public"."Membership"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_organizationId_code_key" ON "public"."Customer"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_organizationId_rfc_key" ON "public"."Customer"("organizationId", "rfc");

-- CreateIndex
CREATE UNIQUE INDEX "Address_customerId_code_key" ON "public"."Address"("customerId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_organizationId_sku_key" ON "public"."Product"("organizationId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_organizationId_code_key" ON "public"."Warehouse"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_warehouseId_productId_key" ON "public"."Stock"("warehouseId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceListItem_priceListId_productId_minQuantity_key" ON "public"."PriceListItem"("priceListId", "productId", "minQuantity");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_organizationId_number_key" ON "public"."SalesOrder"("organizationId", "number");

-- CreateIndex
CREATE INDEX "InvoicePreparation_organizationId_status_createdAt_idx" ON "public"."InvoicePreparation"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "InvoicePreparation_customerId_createdAt_idx" ON "public"."InvoicePreparation"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "InvoicePreparation_payloadHash_idx" ON "public"."InvoicePreparation"("payloadHash");

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePreparation_salesOrderId_version_key" ON "public"."InvoicePreparation"("salesOrderId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalConcept_invoicePreparationId_lineNumber_key" ON "public"."FiscalConcept"("invoicePreparationId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalSchemaCatalog_code_version_key" ON "public"."FiscalSchemaCatalog"("code", "version");

-- CreateIndex
CREATE INDEX "IntegrationDelivery_organizationId_status_createdAt_idx" ON "public"."IntegrationDelivery"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrationDelivery_correlationId_idx" ON "public"."IntegrationDelivery"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationDelivery_organizationId_system_idempotencyKey_key" ON "public"."IntegrationDelivery"("organizationId", "system", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "public"."AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_organizationId_userId_status_idx" ON "public"."AuthSession"("organizationId", "userId", "status");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "public"."AuthSession"("expiresAt");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_organizationId_status_lockedUntil_idx" ON "public"."IdempotencyRecord"("organizationId", "status", "lockedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_organizationId_scope_key_key" ON "public"."IdempotencyRecord"("organizationId", "scope", "key");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_resourceType_resourceId_createdAt_idx" ON "public"."AuditEvent"("organizationId", "resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_correlationId_idx" ON "public"."AuditEvent"("correlationId");

-- CreateIndex
CREATE INDEX "FiscalArtifact_organizationId_invoicePreparationId_type_idx" ON "public"."FiscalArtifact"("organizationId", "invoicePreparationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalArtifact_organizationId_objectKey_key" ON "public"."FiscalArtifact"("organizationId", "objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalArtifact_invoicePreparationId_type_sha256_key" ON "public"."FiscalArtifact"("invoicePreparationId", "type", "sha256");

-- CreateIndex
CREATE INDEX "FiscalStampAttempt_status_startedAt_idx" ON "public"."FiscalStampAttempt"("status", "startedAt");

-- CreateIndex
CREATE INDEX "FiscalStampAttempt_uuid_idx" ON "public"."FiscalStampAttempt"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalStampAttempt_invoicePreparationId_attemptNumber_key" ON "public"."FiscalStampAttempt"("invoicePreparationId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalStampAttempt_idempotencyKey_key" ON "public"."FiscalStampAttempt"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Address" ADD CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Opportunity" ADD CONSTRAINT "Opportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Warehouse" ADD CONSTRAINT "Warehouse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Stock" ADD CONSTRAINT "Stock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Stock" ADD CONSTRAINT "Stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryMovement" ADD CONSTRAINT "InventoryMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PriceList" ADD CONSTRAINT "PriceList_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PriceListItem" ADD CONSTRAINT "PriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "public"."PriceList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PriceListItem" ADD CONSTRAINT "PriceListItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Quote" ADD CONSTRAINT "Quote_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "public"."Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuoteLine" ADD CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "public"."Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuoteLine" ADD CONSTRAINT "QuoteLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalesOrder" ADD CONSTRAINT "SalesOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalesOrder" ADD CONSTRAINT "SalesOrder_deliveryAddressId_fkey" FOREIGN KEY ("deliveryAddressId") REFERENCES "public"."Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoicePreparation" ADD CONSTRAINT "InvoicePreparation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoicePreparation" ADD CONSTRAINT "InvoicePreparation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoicePreparation" ADD CONSTRAINT "InvoicePreparation_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "public"."SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FiscalConcept" ADD CONSTRAINT "FiscalConcept_invoicePreparationId_fkey" FOREIGN KEY ("invoicePreparationId") REFERENCES "public"."InvoicePreparation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FiscalConceptTax" ADD CONSTRAINT "FiscalConceptTax_fiscalConceptId_fkey" FOREIGN KEY ("fiscalConceptId") REFERENCES "public"."FiscalConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntegrationDelivery" ADD CONSTRAINT "IntegrationDelivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuthSession" ADD CONSTRAINT "AuthSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FiscalArtifact" ADD CONSTRAINT "FiscalArtifact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FiscalArtifact" ADD CONSTRAINT "FiscalArtifact_invoicePreparationId_fkey" FOREIGN KEY ("invoicePreparationId") REFERENCES "public"."InvoicePreparation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FiscalStampAttempt" ADD CONSTRAINT "FiscalStampAttempt_invoicePreparationId_fkey" FOREIGN KEY ("invoicePreparationId") REFERENCES "public"."InvoicePreparation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Domain integrity checks not expressible in Prisma.
ALTER TABLE "public"."InvoicePreparation"
  ADD CONSTRAINT "InvoicePreparation_voucherType_check" CHECK ("voucherType" IN ('I','E','T','P')),
  ADD CONSTRAINT "InvoicePreparation_amounts_nonnegative_check" CHECK ("subtotal" >= 0 AND "discount" >= 0 AND "transferredTaxes" >= 0 AND "withheldTaxes" >= 0 AND "total" >= 0);
ALTER TABLE "public"."FiscalConcept"
  ADD CONSTRAINT "FiscalConcept_quantity_positive_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "FiscalConcept_amounts_nonnegative_check" CHECK ("unitValue" >= 0 AND "amount" >= 0 AND "discount" >= 0);
ALTER TABLE "public"."Stock"
  ADD CONSTRAINT "Stock_balances_nonnegative_check" CHECK ("onHand" >= 0 AND "reserved" >= 0 AND "inTransit" >= 0),
  ADD CONSTRAINT "Stock_reserved_lte_onHand_check" CHECK ("reserved" <= "onHand");
ALTER TABLE "public"."FiscalArtifact"
  ADD CONSTRAINT "FiscalArtifact_sha256_check" CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "FiscalArtifact_byteLength_positive_check" CHECK ("byteLength" > 0);
