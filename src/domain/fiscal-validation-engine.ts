import type { InvoicePreparationPayload, ValidationIssue } from "./cfdi40";

export type ValidationLayer =
  | "STRUCTURE"
  | "CATALOG"
  | "SAT_MATRIX"
  | "COMPLEMENT_MATRIX"
  | "BUSINESS"
  | "PAC"
  | "CRYPTO";

export type FiscalRule = {
  id: string;
  source: string;
  layer: ValidationLayer;
  appliesTo: ReadonlyArray<"I" | "E" | "T" | "N" | "P">;
  validate: (document: InvoicePreparationPayload) => ValidationIssue[];
};

const issue = (path: string, code: string, message: string): ValidationIssue => ({ path, code, message });

const paymentRules: FiscalRule[] = [
  {
    id: "XOLUM-P-001",
    source: "SAT REP 2.0 preflight",
    layer: "SAT_MATRIX",
    appliesTo: ["P"],
    validate: ({ cfdi }) => cfdi.currency === "XXX" ? [] : [issue("cfdi.currency", "PAYMENT_CURRENCY", "Un CFDI tipo P debe usar moneda XXX.")],
  },
  {
    id: "XOLUM-P-002",
    source: "SAT REP 2.0 preflight",
    layer: "SAT_MATRIX",
    appliesTo: ["P"],
    validate: ({ cfdi }) => Number(cfdi.subtotal) === 0 && Number(cfdi.total) === 0 ? [] : [issue("cfdi.total", "PAYMENT_ZERO_TOTAL", "Un CFDI tipo P debe tener subtotal y total en cero.")],
  },
  {
    id: "XOLUM-P-003",
    source: "SAT REP 2.0 preflight",
    layer: "SAT_MATRIX",
    appliesTo: ["P"],
    validate: ({ cfdi }) => !cfdi.paymentForm && !cfdi.paymentMethod ? [] : [issue("cfdi.paymentMethod", "PAYMENT_HEADER_TERMS", "FormaPago y MetodoPago no deben existir en el comprobante tipo P.")],
  },
  {
    id: "XOLUM-P-004",
    source: "SAT REP 2.0 preflight",
    layer: "SAT_MATRIX",
    appliesTo: ["P"],
    validate: ({ cfdi }) => cfdi.receiver.cfdiUse === "CP01" ? [] : [issue("cfdi.receiver.cfdiUse", "PAYMENT_CFDI_USE", "El UsoCFDI del comprobante tipo P debe ser CP01.")],
  },
  {
    id: "XOLUM-P-005",
    source: "SAT REP 2.0 preflight",
    layer: "COMPLEMENT_MATRIX",
    appliesTo: ["P"],
    validate: (document) => document.complement?.code === "PAGOS_20" ? [] : [issue("complement.code", "PAYMENT_COMPLEMENT", "El comprobante tipo P requiere Pagos 2.0.")],
  },
  {
    id: "XOLUM-P-006",
    source: "SAT REP 2.0 preflight",
    layer: "SAT_MATRIX",
    appliesTo: ["P"],
    validate: ({ cfdi }) => {
      if (cfdi.concepts.length !== 1) return [issue("cfdi.concepts", "PAYMENT_CONCEPT_COUNT", "Un CFDI tipo P debe contener exactamente un concepto de pago.")];
      const c = cfdi.concepts[0];
      return c.productServiceCode === "84111506" && c.quantity === "1" && c.unitCode === "ACT" &&
        c.description === "Pago" && Number(c.unitValue) === 0 && Number(c.amount) === 0 && c.taxObjectCode === "01"
        ? [] : [issue("cfdi.concepts[0]", "PAYMENT_CONCEPT", "El concepto del CFDI tipo P no coincide con la configuración fiscal de Pago.")];
    },
  },
];

const coreRules: FiscalRule[] = [
  {
    id: "XOLUM-CFDI-001",
    source: "CFDI 4.0 preflight",
    layer: "STRUCTURE",
    appliesTo: ["I", "E", "T", "N", "P"],
    validate: ({ cfdi }) => cfdi.version === "4.0" ? [] : [issue("cfdi.version", "CFDI_VERSION", "Versión distinta de 4.0.")],
  },
  {
    id: "XOLUM-CFDI-002",
    source: "CFDI 4.0 preflight",
    layer: "SAT_MATRIX",
    appliesTo: ["I", "E", "T", "N", "P"],
    validate: ({ cfdi }) => cfdi.exportCode === "02" && !cfdi.receiver.taxResidence
      ? [issue("cfdi.receiver.taxResidence", "EXPORT_RECEIVER", "Una exportación definitiva requiere validar los datos fiscales extranjeros aplicables.")]
      : [],
  },
  {
    id: "XOLUM-CFDI-003",
    source: "CFDI 4.0 preflight",
    layer: "BUSINESS",
    appliesTo: ["I", "E", "T"],
    validate: ({ cfdi }) => cfdi.concepts.every((c) => !c.customerPurchaseOrder || Boolean(c.customerPoLine))
      ? [] : [issue("cfdi.concepts", "PO_POSITION", "Cada OC capturada debe conservar su posición por concepto.")],
  },
  {
    id: "XOLUM-CFDI-004",
    source: "CFDI 4.0 preflight",
    layer: "SAT_MATRIX",
    appliesTo: ["I", "E", "T", "N", "P"],
    validate: ({ cfdi }) => (cfdi.relatedCfdis ?? []).every((group) => group.uuids.every((uuid) => /^[0-9A-F]{8}-[0-9A-F]{4}-[1-5][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(uuid)))
      ? [] : [issue("cfdi.relatedCfdis", "RELATED_UUID", "Cada UUID relacionado debe registrarse individualmente y con formato válido.")],
  },
  {
    id: "XOLUM-CFDI-005",
    source: "CFDI 4.0 preflight",
    layer: "SAT_MATRIX",
    appliesTo: ["I", "E"],
    validate: ({ cfdi }) => cfdi.paymentMethod !== "PUE" || Boolean(cfdi.paymentForm)
      ? [] : [issue("cfdi.paymentForm", "PUE_PAYMENT_FORM", "PUE requiere una FormaPago válida.")],
  },
  {
    id: "XOLUM-CFDI-006",
    source: "CFDI 4.0 preflight",
    layer: "SAT_MATRIX",
    appliesTo: ["I", "E"],
    validate: ({ cfdi }) => cfdi.paymentMethod !== "PPD" || cfdi.paymentForm === "99"
      ? [] : [issue("cfdi.paymentForm", "PPD_PAYMENT_FORM", "PPD requiere FormaPago 99.")],
  },
];

export const PRE_FLIGHT_RULES: readonly FiscalRule[] = [...coreRules, ...paymentRules];

export function runFiscalPreflight(document: InvoicePreparationPayload) {
  const type = document.cfdi.voucherType;
  const issues = PRE_FLIGHT_RULES
    .filter((rule) => rule.appliesTo.includes(type))
    .flatMap((rule) => rule.validate(document).map((result) => ({ ...result, ruleId: rule.id, layer: rule.layer, source: rule.source })));

  return {
    ok: issues.length === 0,
    voucherType: type,
    issues,
    disclaimer: "Preflight preventivo. No sustituye XSD, matrices SAT importadas al 100%, firma CSD ni validación del PAC.",
  };
}

export type CertificationEvidence = {
  schemaValidated: boolean;
  catalogsValidatedAtIssueDate: boolean;
  officialMatrixCoverage: number;
  complementMatrixCoverage: number;
  pacCertificationPassed: boolean;
  cryptoValidationPassed: boolean;
  independentReviewPassed: boolean;
};

export function canEnableProductionStamping(evidence: CertificationEvidence) {
  return evidence.schemaValidated &&
    evidence.catalogsValidatedAtIssueDate &&
    evidence.officialMatrixCoverage === 100 &&
    evidence.complementMatrixCoverage === 100 &&
    evidence.pacCertificationPassed &&
    evidence.cryptoValidationPassed &&
    evidence.independentReviewPassed;
}
