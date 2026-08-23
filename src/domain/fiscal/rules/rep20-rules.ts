import type { InvoicePreparationPayload } from "../../cfdi40";
import type { PrestampFinding } from "../prestamp-validation";
import { formatDecimal, parseDecimal, subtract } from "../calculations";

type RelatedDocument = {
  currency?: string;
  equivalence?: string;
  installment?: number;
  previousBalance?: string;
  paidAmount?: string;
  remainingBalance?: string;
  taxObject?: string;
  taxes?: unknown;
};

type Payment = {
  paymentForm?: string;
  currency?: string;
  exchangeRate?: string;
  amount?: string;
  chainType?: string;
  paymentCertificate?: string;
  paymentChain?: string;
  paymentSignature?: string;
  relatedDocuments?: RelatedDocument[];
};

const SOURCE = "https://www.sat.gob.mx/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1461175071013&ssbinary=true";
const positive = (value?: string) => {
  if (value === undefined || !/^\d+(\.\d+)?$/.test(value)) return false;
  return parseDecimal(value).units > 0n;
};
const equalsOne = (value?: string) => value === undefined || formatDecimal(parseDecimal(value), 6) === "1.000000";

export type Rep20Rule = {
  code: string;
  condition: string;
  test: (payment: Payment, document: RelatedDocument | undefined) => boolean;
};

export const REP20_EXECUTABLE_RULES: readonly Rep20Rule[] = [
  { code: "CRP20212", condition: "FormaDePagoP no puede ser 99.", test: p => p.paymentForm !== "99" },
  { code: "CRP20213", condition: "MonedaP no puede ser XXX.", test: p => p.currency !== "XXX" },
  { code: "CRP20214", condition: "TipoCambioP es requerido cuando MonedaP no es MXN.", test: p => p.currency === "MXN" || positive(p.exchangeRate) },
  { code: "CRP20215", condition: "TipoCambioP debe ser 1 cuando MonedaP es MXN.", test: p => p.currency !== "MXN" || equalsOne(p.exchangeRate) },
  { code: "CRP20218", condition: "Monto debe ser mayor a cero.", test: p => positive(p.amount) },
  { code: "CRP20229", condition: "TipoCadPago solo puede existir con FormaDePagoP 03.", test: p => !p.chainType || p.paymentForm === "03" },
  { code: "CRP20230", condition: "CertPago es requerido cuando existe TipoCadPago.", test: p => !p.chainType || Boolean(p.paymentCertificate) },
  { code: "CRP20231", condition: "CertPago está prohibido cuando no existe TipoCadPago.", test: p => Boolean(p.chainType) || !p.paymentCertificate },
  { code: "CRP20232", condition: "CadPago es requerida cuando existe TipoCadPago.", test: p => !p.chainType || Boolean(p.paymentChain) },
  { code: "CRP20233", condition: "CadPago está prohibida cuando no existe TipoCadPago.", test: p => Boolean(p.chainType) || !p.paymentChain },
  { code: "CRP20234", condition: "SelloPago es requerido cuando existe TipoCadPago.", test: p => !p.chainType || Boolean(p.paymentSignature) },
  { code: "CRP20235", condition: "SelloPago está prohibido cuando no existe TipoCadPago.", test: p => Boolean(p.chainType) || !p.paymentSignature },
  { code: "CRP20236", condition: "MonedaDR no puede ser XXX.", test: (_p,d) => d?.currency !== "XXX" },
  { code: "CRP20237", condition: "EquivalenciaDR es requerida si MonedaDR difiere de MonedaP.", test: (p,d) => !d || d.currency === p.currency || positive(d.equivalence) },
  { code: "CRP20238", condition: "EquivalenciaDR debe ser 1 si las monedas coinciden.", test: (p,d) => !d || d.currency !== p.currency || equalsOne(d.equivalence) },
  { code: "CRP20239", condition: "NumParcialidad debe ser mayor o igual a uno.", test: (_p,d) => !d || Number.isInteger(d.installment) && Number(d.installment) >= 1 },
  { code: "CRP20240", condition: "ImpSaldoAnt debe ser mayor a cero.", test: (_p,d) => !d || positive(d.previousBalance) },
  { code: "CRP20242", condition: "ImpPagado debe ser mayor a cero.", test: (_p,d) => !d || positive(d.paidAmount) },
  { code: "CRP20244", condition: "ImpSaldoInsoluto debe ser igual a saldo anterior menos pagado.", test: (_p,d) => !d || (positive(d.previousBalance) && positive(d.paidAmount) && d.remainingBalance !== undefined && /^\d+(\.\d+)?$/.test(d.remainingBalance) && formatDecimal(subtract(parseDecimal(d.previousBalance!), parseDecimal(d.paidAmount!)), 6) === formatDecimal(parseDecimal(d.remainingBalance), 6)) },
  { code: "CRP20245", condition: "ObjetoImpDR debe existir.", test: (_p,d) => !d || Boolean(d.taxObject) },
  { code: "CRP20246", condition: "ImpuestosDR es requerido cuando ObjetoImpDR indica impuestos.", test: (_p,d) => !d || d.taxObject !== "02" || Boolean(d.taxes) },
  { code: "CRP20247", condition: "ImpuestosDR está prohibido cuando ObjetoImpDR no indica impuestos.", test: (_p,d) => !d || d.taxObject === "02" || !d.taxes },
];

export const REP20_REGISTERED_CODES = REP20_EXECUTABLE_RULES.map(rule => rule.code);

export function validateRep20(document: InvoicePreparationPayload): PrestampFinding[] {
  if (document.cfdi.voucherType !== "P") return [];
  const payload = document.complement?.payload as { payments?: Payment[] } | undefined;
  const payments = payload?.payments ?? [];
  if (document.complement?.code !== "PAGOS_20" || payments.length === 0) {
    return [{
      ruleCode: "CRP20101", layer: "COMPLEMENTS", source: SOURCE, version: "2.0-2026.03",
      severity: "ERROR", path: "complement", code: "CRP20101",
      message: "El comprobante P requiere el complemento Pagos 2.0 con al menos un pago.",
    }];
  }

  return payments.flatMap((payment, paymentIndex) => {
    const documents = payment.relatedDocuments?.length ? payment.relatedDocuments : [undefined];
    return documents.flatMap((related, documentIndex) =>
      REP20_EXECUTABLE_RULES.filter(rule => !rule.test(payment, related)).map(rule => ({
        ruleCode: rule.code,
        layer: rule.code >= "CRP20239" && rule.code <= "CRP20247" ? "CALCULATIONS" as const : "COMPLEMENTS" as const,
        source: SOURCE,
        version: "2.0-2026.03",
        severity: "ERROR" as const,
        path: `complement.payload.payments[${paymentIndex}].relatedDocuments[${documentIndex}]`,
        code: rule.code,
        message: rule.condition,
      }))
    );
  });
}
