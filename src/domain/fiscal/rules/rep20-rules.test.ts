import { describe, expect, it } from "vitest";
import type { InvoicePreparationPayload } from "../../cfdi40";
import { REP20_REGISTERED_CODES, validateRep20 } from "./rep20-rules";

const paymentDocument = (payment: Record<string, unknown>): InvoicePreparationPayload => ({
  schemaVersion: "xolum.sales.invoice-preparation.v1",
  cfdi: {
    version: "4.0", voucherType: "P", currency: "XXX", exportCode: "01",
    placeOfIssue: "64000",
    issuer: { rfc: "AAA010101AAA", legalName: "EMISOR", fiscalRegime: "601" },
    receiver: { rfc: "BBB010101BBB", legalName: "RECEPTOR", fiscalPostalCode: "64000", fiscalRegime: "601", cfdiUse: "CP01" },
    concepts: [], subtotal: "0", total: "0",
  },
  complement: { code: "PAGOS_20", version: "2.0", payload: { payments: [payment] } },
  source: { salesOrderId: "1", salesOrderNumber: "1", snapshotVersion: 1, lockedAt: "2026-08-22T00:00:00Z", payloadHash: "test" },
});

const validPayment = {
  paymentForm: "03", currency: "MXN", exchangeRate: "1", amount: "100.00",
  relatedDocuments: [{
    currency: "MXN", equivalence: "1", installment: 1,
    previousBalance: "100.00", paidAmount: "100.00", remainingBalance: "0.00",
    taxObject: "01",
  }],
};

describe("Pagos 2.0 prestamp matrix", () => {
  it("registers unique SAT codes", () => {
    expect(new Set(REP20_REGISTERED_CODES).size).toBe(REP20_REGISTERED_CODES.length);
    expect(REP20_REGISTERED_CODES.length).toBeGreaterThanOrEqual(22);
  });

  it("accepts a consistent payment", () => {
    expect(validateRep20(paymentDocument(validPayment))).toEqual([]);
  });

  it.each([
    ["CRP20212", { ...validPayment, paymentForm: "99" }],
    ["CRP20213", { ...validPayment, currency: "XXX" }],
    ["CRP20214", { ...validPayment, currency: "USD", exchangeRate: undefined }],
    ["CRP20218", { ...validPayment, amount: "0" }],
    ["CRP20229", { ...validPayment, paymentForm: "01", chainType: "01" }],
  ])("rejects %s before PAC", (code, payment) => {
    expect(validateRep20(paymentDocument(payment)).map(x => x.code)).toContain(code);
  });

  it("detects a broken related-document balance", () => {
    const payment = {
      ...validPayment,
      relatedDocuments: [{ ...validPayment.relatedDocuments[0], remainingBalance: "1.00" }],
    };
    expect(validateRep20(paymentDocument(payment)).map(x => x.code)).toContain("CRP20244");
  });

  it("requires Pagos 2.0 for type P", () => {
    const document = paymentDocument(validPayment);
    document.complement = undefined;
    expect(validateRep20(document).map(x => x.code)).toContain("CRP20101");
  });
});
