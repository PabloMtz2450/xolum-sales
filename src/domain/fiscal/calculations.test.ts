import { describe, expect, it } from "vitest";
import { formatDecimal, multiply, parseDecimal, validateDocumentTotals, validateTaxLine } from "./calculations";

describe("exact fiscal decimals", () => {
  it("does not inherit IEEE-754 cent errors", () => {
    expect(formatDecimal(multiply(parseDecimal("0.1"), parseDecimal("0.2")), 2)).toBe("0.02");
  });

  it("rounds half up at the currency boundary", () => {
    expect(formatDecimal(parseDecimal("1.005"), 2)).toBe("1.01");
  });

  it("validates IVA without floating point", () => {
    expect(validateTaxLine({ base: "100.00", factorType: "Tasa", rateOrQuota: "0.160000", amount: "16.00" }, "tax")).toEqual([]);
  });

  it("rejects amount on exempt taxes", () => {
    expect(validateTaxLine({ base: "100", factorType: "Exento", amount: "0" }, "tax")[0].code).toBe("EXEMPT_PROHIBITED_AMOUNT");
  });

  it("reconciles concepts, discounts, transfers, withholdings and total", () => {
    expect(validateDocumentTotals({
      concepts: [{ quantity: "2", unitValue: "50.00", amount: "100.00", discount: "10.00", taxes: [] }],
      subtotal: "100.00", discount: "10.00", transferredTaxes: "16.00", withheldTaxes: "1.00", total: "105.00",
    })).toEqual([]);
  });

  it("reports a one-cent total difference", () => {
    const findings = validateDocumentTotals({
      concepts: [{ quantity: "1", unitValue: "100.00", amount: "100.00", taxes: [] }],
      subtotal: "100.00", transferredTaxes: "16.00", total: "115.99",
    });
    expect(findings.map(x => x.code)).toContain("TOTAL_MISMATCH");
  });
});
