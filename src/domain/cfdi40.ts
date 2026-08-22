export const SAT_SCHEMAS = {
  CFDI_40: {
    namespace: "http://www.sat.gob.mx/cfd/4",
    xsd: "https://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd",
  },
  DETALLISTA_13: {
    namespace: "http://www.sat.gob.mx/detallista",
    xsd: "https://www.sat.gob.mx/sitio_internet/cfd/detallista/detallista.xsd",
    xslt: "https://www.sat.gob.mx/sitio_internet/cfd/detallista/detallista.xslt",
  },
} as const;

export type CfdiTax = {
  direction: "TRANSFER" | "WITHHOLDING";
  taxCode: "001" | "002" | "003";
  factorType: "Tasa" | "Cuota" | "Exento";
  base: string;
  rateOrQuota?: string;
  amount?: string;
};

export type CfdiConcept = {
  lineNumber: number;
  productServiceCode: string;
  identificationNumber?: string;
  internalSku?: string;
  customerItemCode?: string;
  gtin?: string;
  quantity: string;
  unitCode: string;
  unitName?: string;
  description: string;
  unitValue: string;
  amount: string;
  discount?: string;
  taxObjectCode: "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08";
  customerPurchaseOrder?: string;
  customerPoLine?: string;
  taxes: CfdiTax[];
  customsInformation?: Array<{ documentNumber: string }>;
  propertyAccount?: string;
  thirdPartyAccount?: Record<string, string>;
};

export type DetallistaLineItem = {
  lineNumber: number;
  type: "SimpleInvoiceLineItemType";
  gtin: string;
  alternateItemId?: { type: string; value: string };
  description: string;
  quantity: { value: string; unitOfMeasure: string };
  grossPrice?: string;
  netPrice: string;
  purchaseOrder?: { reference: string; line?: string };
  totalLineAmount: { grossAmount?: string; netAmount: string };
};

export type Detallista13Payload = {
  documentStructureVersion: "AMC8.1";
  documentStatus: "ORIGINAL" | "COPY" | "REEMPLAZA";
  contentVersion: "1.3";
  requestForPaymentIdentification: { entityType: string; uniqueCreatorIdentification: string };
  specialInstructions?: Array<{ code: string; text: string }>;
  orderIdentification: { reference: string; referenceDate?: string };
  deliveryNote?: { reference: string; referenceDate?: string };
  buyer: { gln?: string; contactInformation?: Record<string, string> };
  seller: { gln?: string; supplierIdentification?: string };
  shipTo: { gln?: string; nameAndAddress?: Record<string, string> };
  currency: { currencyISOCode: string; currencyFunction?: string; rateOfChange?: string };
  paymentTerms?: Array<Record<string, string>>;
  shipmentDetail?: Record<string, string>;
  allowanceCharges?: Array<Record<string, string>>;
  lineItems: DetallistaLineItem[];
  totalAmount: {
    amount: string;
    allowanceChargeAmount?: string;
  };
};

export type InvoicePreparationPayload = {
  schemaVersion: "xolum.sales.invoice-preparation.v1";
  cfdi: {
    version: "4.0";
    voucherType: "I" | "E" | "T";
    currency: string;
    exchangeRate?: string;
    paymentMethod: "PUE" | "PPD";
    paymentForm?: string;
    exportCode: "01" | "02" | "03" | "04";
    placeOfIssue: string;
    issuer: { rfc: string; legalName: string; fiscalRegime: string };
    receiver: {
      rfc: string;
      legalName: string;
      fiscalPostalCode: string;
      fiscalRegime: string;
      cfdiUse: string;
      taxResidence?: string;
      foreignTaxId?: string;
    };
    relatedCfdis?: Array<{ relationType: string; uuids: string[] }>;
    concepts: CfdiConcept[];
    subtotal: string;
    discount?: string;
    transferredTaxes?: string;
    withheldTaxes?: string;
    total: string;
  };
  complement?: {
    code: "DETALLISTA_13" | "COMERCIO_EXTERIOR_20" | "CARTA_PORTE_31" | string;
    version: string;
    payload: Detallista13Payload | Record<string, unknown>;
  };
  addenda?: {
    code: string;
    version: string;
    payload: Record<string, unknown>;
  };
  source: {
    salesOrderId: string;
    salesOrderNumber: string;
    snapshotVersion: number;
    lockedAt: string;
    payloadHash: string;
  };
};

export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
};

const RFC_PATTERN = /^([A-ZÑ&]{3,4})\d{6}[A-Z0-9]{3}$/;
const POSTAL_CODE_PATTERN = /^\d{5}$/;

export function validateInvoicePreparation(input: InvoicePreparationPayload): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { cfdi } = input;

  if (cfdi.version !== "4.0") issues.push({ path: "cfdi.version", code: "CFDI_VERSION", message: "La versión debe ser 4.0." });
  if (!RFC_PATTERN.test(cfdi.issuer.rfc)) issues.push({ path: "cfdi.issuer.rfc", code: "RFC_ISSUER", message: "RFC del emisor inválido." });
  if (!RFC_PATTERN.test(cfdi.receiver.rfc)) issues.push({ path: "cfdi.receiver.rfc", code: "RFC_RECEIVER", message: "RFC del receptor inválido." });
  if (!POSTAL_CODE_PATTERN.test(cfdi.receiver.fiscalPostalCode)) issues.push({ path: "cfdi.receiver.fiscalPostalCode", code: "POSTAL_CODE", message: "El código postal fiscal debe tener 5 dígitos." });
  if (!POSTAL_CODE_PATTERN.test(cfdi.placeOfIssue)) issues.push({ path: "cfdi.placeOfIssue", code: "ISSUE_POSTAL_CODE", message: "El lugar de expedición debe ser un código postal válido." });
  if (!cfdi.concepts.length) issues.push({ path: "cfdi.concepts", code: "EMPTY_CONCEPTS", message: "La factura requiere al menos un concepto." });

  cfdi.concepts.forEach((concept, index) => {
    const base = `cfdi.concepts[${index}]`;
    if (!concept.productServiceCode) issues.push({ path: `${base}.productServiceCode`, code: "SAT_PRODUCT", message: "Falta la clave SAT." });
    if (!concept.unitCode) issues.push({ path: `${base}.unitCode`, code: "SAT_UNIT", message: "Falta la unidad SAT." });
    if (!concept.description.trim()) issues.push({ path: `${base}.description`, code: "DESCRIPTION", message: "Falta la descripción." });
    if (Number(concept.quantity) <= 0) issues.push({ path: `${base}.quantity`, code: "QUANTITY", message: "La cantidad debe ser mayor a cero." });
    if (concept.customerPurchaseOrder && !concept.customerPoLine) {
      issues.push({ path: `${base}.customerPoLine`, code: "PO_LINE", message: "La OC por concepto requiere posición de cliente." });
    }
  });

  if (input.complement?.code === "DETALLISTA_13") {
    const detail = input.complement.payload as Detallista13Payload;
    if (!detail.orderIdentification?.reference) issues.push({ path: "complement.payload.orderIdentification.reference", code: "DETAIL_ORDER", message: "Detallista requiere referencia de pedido." });
    if (detail.lineItems?.length !== cfdi.concepts.length) issues.push({ path: "complement.payload.lineItems", code: "DETAIL_LINES", message: "Cada concepto CFDI debe corresponder con una línea Detallista." });
  }

  return issues;
}
