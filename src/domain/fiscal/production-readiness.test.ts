import { describe, expect, it } from "vitest";
import { assertReadyToStamp, evaluateProductionReadiness, type FiscalArtifactEvidence } from "./production-readiness";

const evidence = (): FiscalArtifactEvidence => ({
  cfdiMatrix: { registered: 100, officialTotal: 100, positiveTests: 100, negativeTests: 100 },
  repMatrix: { registered: 80, officialTotal: 80, positiveTests: 80, negativeTests: 80 },
  xsd: { cfdi40: true, complements: { PAGOS_20: true }, xmlSha256: "same" },
  cryptography: { certificateParsed: true, rfcMatches: true, certificateValid: true, privateKeyMatches: true, originalStringVerified: true, signatureVerified: true },
  pacSandbox: { provider: "sandbox", executed: true, accepted: true, xmlSha256: "same" },
  corpus: { total: 20, passed: 20, expectedRejections: 10, correctlyRejected: 10 },
  reviews: { first: true, second: true, independentReviewer: "reviewer-2" },
});

describe("fiscal production gate", () => {
  it("only opens with complete evidence", () => {
    expect(evaluateProductionReadiness(evidence()).ready).toBe(true);
    expect(() => assertReadyToStamp(evidence())).not.toThrow();
  });

  it.each([
    ["matrix", (x: FiscalArtifactEvidence) => { x.cfdiMatrix.registered--; }],
    ["negative test", (x: FiscalArtifactEvidence) => { x.repMatrix.negativeTests--; }],
    ["XSD", (x: FiscalArtifactEvidence) => { x.xsd.cfdi40 = false; }],
    ["CSD", (x: FiscalArtifactEvidence) => { x.cryptography.signatureVerified = false; }],
    ["different XML", (x: FiscalArtifactEvidence) => { x.pacSandbox.xmlSha256 = "changed"; }],
    ["PAC", (x: FiscalArtifactEvidence) => { x.pacSandbox.accepted = false; }],
    ["corpus", (x: FiscalArtifactEvidence) => { x.corpus.passed--; }],
    ["second review", (x: FiscalArtifactEvidence) => { x.reviews.second = false; }],
  ])("blocks stamping when %s evidence fails", (_name, mutate) => {
    const sample = evidence();
    mutate(sample);
    expect(evaluateProductionReadiness(sample).ready).toBe(false);
    expect(() => assertReadyToStamp(sample)).toThrow(/TIMBRADO_BLOQUEADO/);
  });
});
