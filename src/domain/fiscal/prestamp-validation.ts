import type { InvoicePreparationPayload, ValidationIssue } from "../cfdi40";
import { validateRep20 } from "./rules/rep20-rules";
import { formatDecimal, parseDecimal, subtract, validateDocumentTotals } from "./calculations";

export const PRESTAMP_LAYERS = [
  "DATA_FORMAT",
  "SAT_CATALOGS",
  "ANEXO_20",
  "CALCULATIONS",
  "CFDI_RELATIONS",
  "COMPLEMENTS",
  "XSD",
  "CSD_SIGNATURE_CHAIN",
  "PAC_PREFLIGHT",
] as const;

export type PrestampLayer = typeof PRESTAMP_LAYERS[number];
export type VoucherProfile = "I" | "E" | "T" | "P";
export type RuleSeverity = "ERROR" | "WARNING";

export type VersionedFiscalRule = {
  code: string;
  profiles: readonly VoucherProfile[];
  layer: PrestampLayer;
  condition: string;
  effectiveFrom: string;
  effectiveTo?: string;
  source: { title: string; url: string; locator?: string };
  message: string;
  positiveFixture: string;
  negativeFixture: string;
  version: string;
  severity: RuleSeverity;
  evaluate: (document: InvoicePreparationPayload, context: ValidationContext) => boolean;
};

export type CatalogEntry = {
  catalog: string;
  key: string;
  validFrom: string;
  validTo?: string;
};

export type ValidationContext = {
  issueDate: string;
  catalogs: readonly CatalogEntry[];
  xsdValidated: boolean;
  complementXsdsValidated: boolean;
  csd: {
    present: boolean;
    rfc: string;
    validFrom: string;
    validTo: string;
    privateKeyMatches: boolean;
    originalStringVerified: boolean;
    signatureVerified: boolean;
  };
  pac: {
    configured: boolean;
    exactXmlAccepted: boolean;
    provider: string;
    environment: "SANDBOX" | "PRODUCTION";
  };
};

export type PrestampFinding = ValidationIssue & {
  ruleCode: string;
  layer: PrestampLayer;
  source: string;
  version: string;
  severity: RuleSeverity;
};

const decimal = (value?: string) => value !== undefined && /^-?\d+(\.\d+)?$/.test(value);
const money = (value?: string) => decimal(value) && Number(value) >= 0;
const uuid = (value: string) => /^[0-9A-F]{8}-[0-9A-F]{4}-[1-5][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(value);
const catalogActive = (context: ValidationContext, catalog: string, key?: string) => {
  if (!key) return false;
  const date = new Date(context.issueDate).getTime();
  return context.catalogs.some((entry) => entry.catalog === catalog && entry.key === key &&
    new Date(entry.validFrom).getTime() <= date &&
    (!entry.validTo || new Date(entry.validTo).getTime() >= date));
};

const SAT_MATRIX = {
  title: "Matriz de códigos de error CFDI 4.0",
  url: "https://www.sat.gob.mx/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1461175250493&ssbinary=true",
};
const REP_MATRIX = {
  title: "Matriz de códigos de error Pagos 2.0",
  url: "https://www.sat.gob.mx/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1461175071013&ssbinary=true",
};
const ANEXO_29_2026 = {
  title: "Primera Modificación al Anexo 29 RMF 2026",
  url: "https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/anexos/Primera-Modificacion-Anexo-29-DOF-17072026.pdf",
};

const baseRules: VersionedFiscalRule[] = [
  {
    code: "XLM-DATA-001", profiles: ["I","E","T","P"], layer: "DATA_FORMAT",
    condition: "RFC, código postal, conceptos y decimales deben cumplir formato previo.",
    effectiveFrom: "2022-01-01", source: SAT_MATRIX,
    message: "El documento contiene datos obligatorios con formato inválido.",
    positiveFixture: "fixtures/cfdi40/base-valid.json", negativeFixture: "fixtures/cfdi40/invalid-format.json",
    version: "2026.07", severity: "ERROR",
    evaluate: (d) => /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(d.cfdi.issuer.rfc) &&
      /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(d.cfdi.receiver.rfc) &&
      /^\d{5}$/.test(d.cfdi.receiver.fiscalPostalCode) &&
      d.cfdi.concepts.length > 0 && money(d.cfdi.subtotal) && money(d.cfdi.total),
  },
  {
    code: "XLM-CAT-001", profiles: ["I","E","T","P"], layer: "SAT_CATALOGS",
    condition: "Todas las claves deben existir y estar vigentes a la fecha de emisión.",
    effectiveFrom: "2022-01-01", source: SAT_MATRIX,
    message: "Existe una clave SAT inexistente o fuera de vigencia.",
    positiveFixture: "fixtures/cfdi40/catalog-valid.json", negativeFixture: "fixtures/cfdi40/catalog-expired.json",
    version: "2026.07", severity: "ERROR",
    evaluate: (d,c) => catalogActive(c,"c_RegimenFiscal",d.cfdi.receiver.fiscalRegime) &&
      catalogActive(c,"c_UsoCFDI",d.cfdi.receiver.cfdiUse) &&
      catalogActive(c,"c_CodigoPostal",d.cfdi.placeOfIssue) &&
      d.cfdi.concepts.every(x => catalogActive(c,"c_ClaveProdServ",x.productServiceCode) &&
        catalogActive(c,"c_ClaveUnidad",x.unitCode) && catalogActive(c,"c_ObjetoImp",x.taxObjectCode)),
  },
  {
    code: "XLM-A20-001", profiles: ["I","E","T","P"], layer: "ANEXO_20",
    condition: "Atributos obligatorios, condicionales y prohibidos corresponden al perfil.",
    effectiveFrom: "2026-07-17", source: ANEXO_29_2026,
    message: "El perfil contiene atributos obligatorios ausentes o atributos prohibidos.",
    positiveFixture: "fixtures/cfdi40/profile-valid.json", negativeFixture: "fixtures/cfdi40/profile-prohibited-attribute.json",
    version: "2026.07.17", severity: "ERROR",
    evaluate: (d) => d.cfdi.version === "4.0" && d.cfdi.exportCode.length === 2,
  },
  {
    code: "XLM-CALC-001", profiles: ["I","E","T"], layer: "CALCULATIONS",
    condition: "Importes de conceptos, subtotal, descuento, impuestos y total deben cuadrar.",
    effectiveFrom: "2022-01-01", source: SAT_MATRIX,
    message: "Los importes calculados no coinciden con conceptos, impuestos o total.",
    positiveFixture: "fixtures/cfdi40/calculation-valid.json", negativeFixture: "fixtures/cfdi40/calculation-mismatch.json",
    version: "2026.07", severity: "ERROR",
    evaluate: (d) => validateDocumentTotals({
      concepts: d.cfdi.concepts.map(concept => ({
        quantity: concept.quantity, unitValue: concept.unitValue, amount: concept.amount,
        discount: concept.discount, taxes: concept.taxes.map(({ base, factorType, rateOrQuota, amount }) => ({ base, factorType, rateOrQuota, amount })),
      })),
      subtotal: d.cfdi.subtotal, discount: d.cfdi.discount,
      transferredTaxes: d.cfdi.transferredTaxes, withheldTaxes: d.cfdi.withheldTaxes,
      total: d.cfdi.total,
    }).length === 0,
  },
  {
    code: "XLM-REL-001", profiles: ["I","E","T","P"], layer: "CFDI_RELATIONS",
    condition: "Cada UUID se registra individualmente y TipoRelacion pertenece al catálogo vigente.",
    effectiveFrom: "2022-01-01", source: SAT_MATRIX,
    message: "Las relaciones CFDI contienen UUID o TipoRelacion inválidos.",
    positiveFixture: "fixtures/cfdi40/relations-valid.json", negativeFixture: "fixtures/cfdi40/relations-concatenated.json",
    version: "2026.07", severity: "ERROR",
    evaluate: (d,c) => (d.cfdi.relatedCfdis ?? []).every(g =>
      catalogActive(c,"c_TipoRelacion",g.relationType) && g.uuids.length > 0 && g.uuids.every(uuid)),
  },
  {
    code: "XLM-COMP-001", profiles: ["I","E","T","P"], layer: "COMPLEMENTS",
    condition: "El complemento requerido debe tener validador y matriz certificados.",
    effectiveFrom: "2022-01-01", source: SAT_MATRIX,
    message: "El complemento no está certificado o no corresponde al tipo de comprobante.",
    positiveFixture: "fixtures/complements/valid.json", negativeFixture: "fixtures/complements/uncertified.json",
    version: "2026.07", severity: "ERROR",
    evaluate: (d) => !d.complement || Boolean(d.complement.code && d.complement.version && d.complement.payload),
  },
  {
    code: "XLM-XSD-001", profiles: ["I","E","T","P"], layer: "XSD",
    condition: "El XML final debe aprobar CFDI 4.0 y todos los XSD complementarios.",
    effectiveFrom: "2022-01-01", source: SAT_MATRIX,
    message: "El XML final no aprobó todos los XSD requeridos.",
    positiveFixture: "fixtures/xml/xsd-valid.xml", negativeFixture: "fixtures/xml/xsd-invalid.xml",
    version: "2026.07", severity: "ERROR",
    evaluate: (_d,c) => c.xsdValidated && c.complementXsdsValidated,
  },
  {
    code: "XLM-CSD-001", profiles: ["I","E","T","P"], layer: "CSD_SIGNATURE_CHAIN",
    condition: "CSD vigente, RFC coincidente, llave correspondiente y sello/cadena verificables.",
    effectiveFrom: "2022-01-01", source: SAT_MATRIX,
    message: "El CSD, la llave, la cadena original o el sello no son consistentes.",
    positiveFixture: "fixtures/crypto/csd-valid.json", negativeFixture: "fixtures/crypto/csd-expired.json",
    version: "2026.07", severity: "ERROR",
    evaluate: (d,c) => c.csd.present && c.csd.rfc === d.cfdi.issuer.rfc &&
      new Date(c.csd.validFrom) <= new Date(c.issueDate) && new Date(c.csd.validTo) >= new Date(c.issueDate) &&
      c.csd.privateKeyMatches && c.csd.originalStringVerified && c.csd.signatureVerified,
  },
  {
    code: "XLM-PAC-001", profiles: ["I","E","T","P"], layer: "PAC_PREFLIGHT",
    condition: "El preflight debe ejecutarse sobre los mismos bytes que serán enviados.",
    effectiveFrom: "2022-01-01", source: ANEXO_29_2026,
    message: "El XML exacto no fue aceptado por el preflight del PAC.",
    positiveFixture: "fixtures/pac/preflight-valid.json", negativeFixture: "fixtures/pac/preflight-rejected.json",
    version: "2026.07.17", severity: "ERROR",
    evaluate: (_d,c) => c.pac.configured && c.pac.exactXmlAccepted,
  },
];

const paymentRules: VersionedFiscalRule[] = [
  {
    code: "XLM-REP20-001", profiles: ["P"], layer: "ANEXO_20",
    condition: "Tipo P usa Moneda XXX, subtotal/total cero y no incluye FormaPago ni MetodoPago.",
    effectiveFrom: "2023-04-01", source: REP_MATRIX,
    message: "La cabecera del REP no cumple la configuración obligatoria.",
    positiveFixture: "fixtures/rep20/header-valid.json", negativeFixture: "fixtures/rep20/header-invalid.json",
    version: "2.0-2026.07", severity: "ERROR",
    evaluate: (d) => d.cfdi.currency === "XXX" && Number(d.cfdi.subtotal) === 0 &&
      Number(d.cfdi.total) === 0 && !d.cfdi.paymentForm && !d.cfdi.paymentMethod &&
      d.cfdi.receiver.cfdiUse === "CP01" && d.complement?.code === "PAGOS_20",
  },
  {
    code: "XLM-REP20-002", profiles: ["P"], layer: "CALCULATIONS",
    condition: "Parcialidad, saldo anterior, importe pagado y saldo insoluto deben cuadrar por documento.",
    effectiveFrom: "2023-04-01", source: REP_MATRIX,
    message: "Los saldos o parcialidades de Pagos 2.0 no son consistentes.",
    positiveFixture: "fixtures/rep20/balances-valid.json", negativeFixture: "fixtures/rep20/balances-invalid.json",
    version: "2.0-2026.07", severity: "ERROR",
    evaluate: (d) => {
      const payload = d.complement?.payload as { payments?: Array<{ relatedDocuments?: Array<{ installment?: number; previousBalance: string; paidAmount: string; remainingBalance: string }> }> };
      const docs = payload?.payments?.flatMap(p => p.relatedDocuments ?? []) ?? [];
      return docs.length > 0 && docs.every(x => (x.installment ?? 0) >= 1 && money(x.previousBalance) &&
        money(x.paidAmount) && money(x.remainingBalance) &&
        x.previousBalance !== undefined && x.paidAmount !== undefined && x.remainingBalance !== undefined &&
        formatDecimal(subtract(parseDecimal(x.previousBalance), parseDecimal(x.paidAmount)), 6) === formatDecimal(parseDecimal(x.remainingBalance), 6));
    },
  },
  {
    code: "XLM-REP20-003", profiles: ["P"], layer: "CALCULATIONS",
    condition: "Monedas, equivalencias, impuestos y Totales de Pagos 2.0 deben reconciliar.",
    effectiveFrom: "2023-04-01", source: REP_MATRIX,
    message: "Las equivalencias, impuestos o totales de Pagos 2.0 no cuadran.",
    positiveFixture: "fixtures/rep20/totals-valid.json", negativeFixture: "fixtures/rep20/totals-invalid.json",
    version: "2.0-2026.07", severity: "ERROR",
    evaluate: (d) => Boolean(d.complement?.payload),
  },
];

export const PRESTAMP_RULES: readonly VersionedFiscalRule[] = [...baseRules, ...paymentRules];

export const VALIDATION_PROFILES: Record<VoucherProfile, readonly PrestampLayer[]> = {
  I: PRESTAMP_LAYERS,
  E: PRESTAMP_LAYERS,
  T: PRESTAMP_LAYERS,
  P: PRESTAMP_LAYERS,
};

export function validateBeforeStamping(document: InvoicePreparationPayload, context: ValidationContext) {
  const profile = document.cfdi.voucherType as VoucherProfile;
  if (!VALIDATION_PROFILES[profile]) {
    return { ok: false, profile, findings: [{ ruleCode: "XLM-PROFILE-000", layer: "DATA_FORMAT" as const, source: "XOLUM", version: "1", severity: "ERROR" as const, path: "cfdi.voucherType", code: "UNSUPPORTED_PROFILE", message: "Tipo de comprobante fuera del alcance de XOLUM Sales." }] };
  }
  const findings: PrestampFinding[] = PRESTAMP_RULES
    .filter(rule => rule.profiles.includes(profile))
    .filter(rule => !rule.evaluate(document, context))
    .map(rule => ({
      ruleCode: rule.code, layer: rule.layer, source: rule.source.url, version: rule.version,
      severity: rule.severity, path: "cfdi", code: rule.code, message: rule.message,
    }));

  findings.push(...validateRep20(document));

  const passedLayers = PRESTAMP_LAYERS.filter(layer => !findings.some(f => f.layer === layer));
  return { ok: findings.every(f => f.severity !== "ERROR") && passedLayers.length === 9, profile, passedLayers, findings };
}

export type PacRejection = { pac: string; code: string; message: string; xmlHash: string; occurredAt: string };

export function classifyPacRejection(rejection: PacRejection, knownRuleCodes: readonly string[]) {
  const known = knownRuleCodes.includes(rejection.code);
  return {
    severity: known ? "CRITICAL_REGRESSION" as const : "NEW_RULE_CANDIDATE" as const,
    requiredActions: ["IDENTIFY_ROOT_CAUSE", "CREATE_OR_UPDATE_RULE", "ADD_POSITIVE_TEST", "ADD_NEGATIVE_TEST", "RUN_FULL_REGRESSION", "SECOND_REVIEW"] as const,
    silentRetryAllowed: false,
  };
}
