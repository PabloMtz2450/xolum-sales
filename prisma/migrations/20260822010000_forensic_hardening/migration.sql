CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "AuditEvent" ADD COLUMN "previousHash" TEXT;
ALTER TABLE "AuditEvent" ADD COLUMN "eventHash" TEXT;
UPDATE "AuditEvent"
SET "eventHash" = encode(digest(id || '|' || "organizationId" || '|' || action || '|' || "resourceId" || '|' || "createdAt"::text, 'sha256'), 'hex')
WHERE "eventHash" IS NULL;
ALTER TABLE "AuditEvent" ALTER COLUMN "eventHash" SET NOT NULL;
CREATE UNIQUE INDEX "AuditEvent_eventHash_key" ON "AuditEvent"("eventHash");

CREATE OR REPLACE FUNCTION xolum_audit_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_EVENT_APPEND_ONLY';
END $$;
CREATE TRIGGER "AuditEvent_append_only"
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION xolum_audit_append_only();

ALTER TABLE "FiscalStampAttempt" ADD COLUMN "organizationId" TEXT;
UPDATE "FiscalStampAttempt" a
SET "organizationId" = p."organizationId"
FROM "InvoicePreparation" p
WHERE p.id = a."invoicePreparationId";
ALTER TABLE "FiscalStampAttempt" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "FiscalStampAttempt" ADD CONSTRAINT "FiscalStampAttempt_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
DROP INDEX "FiscalStampAttempt_idempotencyKey_key";
CREATE UNIQUE INDEX "FiscalStampAttempt_organizationId_idempotencyKey_key"
  ON "FiscalStampAttempt"("organizationId", "idempotencyKey");
CREATE INDEX "FiscalStampAttempt_organizationId_status_startedAt_idx"
  ON "FiscalStampAttempt"("organizationId", status, "startedAt");
CREATE INDEX "FiscalStampAttempt_invoicePreparationId_status_startedAt_idx"
  ON "FiscalStampAttempt"("invoicePreparationId", status, "startedAt");

CREATE OR REPLACE FUNCTION xolum_assert_tenant_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE linked_org TEXT;
BEGIN
  IF TG_TABLE_NAME = 'SalesOrder' THEN
    SELECT "organizationId" INTO linked_org FROM "Customer" WHERE id = NEW."customerId";
    IF linked_org IS DISTINCT FROM NEW."organizationId" THEN RAISE EXCEPTION 'TENANT_CUSTOMER_MISMATCH'; END IF;
    SELECT c."organizationId" INTO linked_org FROM "Address" a JOIN "Customer" c ON c.id = a."customerId" WHERE a.id = NEW."deliveryAddressId";
    IF linked_org IS DISTINCT FROM NEW."organizationId" THEN RAISE EXCEPTION 'TENANT_ADDRESS_MISMATCH'; END IF;
  ELSIF TG_TABLE_NAME = 'InvoicePreparation' THEN
    SELECT "organizationId" INTO linked_org FROM "SalesOrder" WHERE id = NEW."salesOrderId";
    IF linked_org IS DISTINCT FROM NEW."organizationId" THEN RAISE EXCEPTION 'TENANT_ORDER_MISMATCH'; END IF;
    SELECT "organizationId" INTO linked_org FROM "Customer" WHERE id = NEW."customerId";
    IF linked_org IS DISTINCT FROM NEW."organizationId" THEN RAISE EXCEPTION 'TENANT_CUSTOMER_MISMATCH'; END IF;
  ELSIF TG_TABLE_NAME = 'FiscalArtifact' THEN
    SELECT "organizationId" INTO linked_org FROM "InvoicePreparation" WHERE id = NEW."invoicePreparationId";
    IF linked_org IS DISTINCT FROM NEW."organizationId" THEN RAISE EXCEPTION 'TENANT_ARTIFACT_MISMATCH'; END IF;
  ELSIF TG_TABLE_NAME = 'FiscalStampAttempt' THEN
    SELECT "organizationId" INTO linked_org FROM "InvoicePreparation" WHERE id = NEW."invoicePreparationId";
    IF linked_org IS DISTINCT FROM NEW."organizationId" THEN RAISE EXCEPTION 'TENANT_ATTEMPT_MISMATCH'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "SalesOrder_tenant_links" BEFORE INSERT OR UPDATE ON "SalesOrder" FOR EACH ROW EXECUTE FUNCTION xolum_assert_tenant_links();
CREATE TRIGGER "InvoicePreparation_tenant_links" BEFORE INSERT OR UPDATE ON "InvoicePreparation" FOR EACH ROW EXECUTE FUNCTION xolum_assert_tenant_links();
CREATE TRIGGER "FiscalArtifact_tenant_links" BEFORE INSERT OR UPDATE ON "FiscalArtifact" FOR EACH ROW EXECUTE FUNCTION xolum_assert_tenant_links();
CREATE TRIGGER "FiscalStampAttempt_tenant_links" BEFORE INSERT OR UPDATE ON "FiscalStampAttempt" FOR EACH ROW EXECUTE FUNCTION xolum_assert_tenant_links();

CREATE OR REPLACE FUNCTION xolum_current_tenant() RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.organization_id', true), '')
$$;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Customer','Opportunity','Product','Warehouse','PriceList','SalesOrder','InvoicePreparation','IntegrationDelivery','AuthSession','IdempotencyRecord','AuditEvent','FiscalArtifact','FiscalStampAttempt']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING ("organizationId" = xolum_current_tenant()) WITH CHECK ("organizationId" = xolum_current_tenant())', table_name);
  END LOOP;
END $$;
