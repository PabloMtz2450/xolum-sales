import { createHash, createPublicKey, verify, X509Certificate } from "node:crypto";

export type FiscalArtifactEvidence = {
  cfdiMatrix: { registered: number; officialTotal: number; positiveTests: number; negativeTests: number };
  repMatrix: { registered: number; officialTotal: number; positiveTests: number; negativeTests: number };
  xsd: { cfdi40: boolean; complements: Record<string, boolean>; xmlSha256: string };
  cryptography: { certificateParsed: boolean; rfcMatches: boolean; certificateValid: boolean; privateKeyMatches: boolean; originalStringVerified: boolean; signatureVerified: boolean };
  pacSandbox: { provider: string; executed: boolean; accepted: boolean; xmlSha256: string };
  corpus: { total: number; passed: number; expectedRejections: number; correctlyRejected: number };
  reviews: { first: boolean; second: boolean; independentReviewer?: string };
};

export type ProductionGate = {
  ready: boolean;
  blockers: string[];
  evidence: FiscalArtifactEvidence;
};

export const sha256 = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

export function verifyCsd(input: {
  certificatePem: string;
  issuerRfc: string;
  issueDate: string;
  originalString: string;
  sealBase64: string;
  privateKeyPublicPem?: string;
}) {
  try {
    const certificate = new X509Certificate(input.certificatePem);
    const subject = certificate.subject.toUpperCase();
    const issueDate = new Date(input.issueDate);
    const validFrom = new Date(certificate.validFrom);
    const validTo = new Date(certificate.validTo);
    const rfcMatches = subject.includes(input.issuerRfc.toUpperCase());
    const certificateValid = issueDate >= validFrom && issueDate <= validTo;
    const signatureVerified = verify(
      "RSA-SHA256",
      Buffer.from(input.originalString, "utf8"),
      certificate.publicKey,
      Buffer.from(input.sealBase64, "base64"),
    );
    const privateKeyMatches = input.privateKeyPublicPem
      ? createPublicKey(input.privateKeyPublicPem).export({ type: "spki", format: "pem" }).toString() ===
        certificate.publicKey.export({ type: "spki", format: "pem" }).toString()
      : false;
    return { certificateParsed: true, rfcMatches, certificateValid, privateKeyMatches, originalStringVerified: signatureVerified, signatureVerified };
  } catch {
    return { certificateParsed: false, rfcMatches: false, certificateValid: false, privateKeyMatches: false, originalStringVerified: false, signatureVerified: false };
  }
}

export function evaluateProductionReadiness(evidence: FiscalArtifactEvidence): ProductionGate {
  const blockers: string[] = [];
  const matrix = (name: string, value: FiscalArtifactEvidence["cfdiMatrix"]) => {
    if (value.officialTotal <= 0 || value.registered !== value.officialTotal) blockers.push(`${name}: matriz oficial incompleta`);
    if (value.positiveTests !== value.officialTotal || value.negativeTests !== value.officialTotal) blockers.push(`${name}: faltan pruebas positivas o negativas`);
  };
  matrix("CFDI40", evidence.cfdiMatrix);
  matrix("REP20", evidence.repMatrix);
  if (!evidence.xsd.cfdi40 || Object.values(evidence.xsd.complements).some(value => !value)) blockers.push("XSD: CFDI o complemento no validado");
  if (!evidence.xsd.xmlSha256) blockers.push("XSD: falta hash del XML final");
  if (Object.values(evidence.cryptography).some(value => !value)) blockers.push("CSD: certificado, cadena o sello sin verificar");
  if (!evidence.pacSandbox.provider || !evidence.pacSandbox.executed || !evidence.pacSandbox.accepted) blockers.push("PAC: sandbox no aprobado");
  if (!evidence.pacSandbox.xmlSha256 || evidence.pacSandbox.xmlSha256 !== evidence.xsd.xmlSha256) blockers.push("PAC: el XML probado no coincide byte a byte");
  if (evidence.corpus.total <= 0 || evidence.corpus.passed !== evidence.corpus.total || evidence.corpus.expectedRejections !== evidence.corpus.correctlyRejected) blockers.push("Corpus XML: ejecución incompleta");
  if (!evidence.reviews.first || !evidence.reviews.second) blockers.push("Gobernanza: faltan las dos revisiones");
  return { ready: blockers.length === 0, blockers, evidence };
}

export function assertReadyToStamp(evidence: FiscalArtifactEvidence): void {
  const result = evaluateProductionReadiness(evidence);
  if (!result.ready) throw new Error(`TIMBRADO_BLOQUEADO: ${result.blockers.join("; ")}`);
}
