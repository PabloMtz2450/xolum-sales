export type Decimal = { units: bigint; scale: number };

export function parseDecimal(value: string): Decimal {
  if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error(`DECIMAL_INVALIDO: ${value}`);
  const negative = value.startsWith("-");
  const normalized = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = normalized.split(".");
  const units = BigInt(whole + fraction) * (negative ? -1n : 1n);
  return { units, scale: fraction.length };
}

const pow10 = (scale: number) => 10n ** BigInt(scale);
const align = (value: Decimal, scale: number) => value.units * pow10(scale - value.scale);

export function add(...values: Decimal[]): Decimal {
  const scale = Math.max(0, ...values.map(value => value.scale));
  return { units: values.reduce((sum, value) => sum + align(value, scale), 0n), scale };
}

export function subtract(left: Decimal, right: Decimal): Decimal {
  const scale = Math.max(left.scale, right.scale);
  return { units: align(left, scale) - align(right, scale), scale };
}

export function multiply(left: Decimal, right: Decimal): Decimal {
  return { units: left.units * right.units, scale: left.scale + right.scale };
}

export function roundHalfUp(value: Decimal, scale: number): Decimal {
  if (value.scale <= scale) return { units: align(value, scale), scale };
  const divisor = pow10(value.scale - scale);
  const absolute = value.units < 0n ? -value.units : value.units;
  const quotient = absolute / divisor;
  const remainder = absolute % divisor;
  const rounded = quotient + (remainder * 2n >= divisor ? 1n : 0n);
  return { units: value.units < 0n ? -rounded : rounded, scale };
}

export function formatDecimal(value: Decimal, scale = value.scale): string {
  const rounded = roundHalfUp(value, scale);
  const negative = rounded.units < 0n;
  const absolute = (negative ? -rounded.units : rounded.units).toString().padStart(scale + 1, "0");
  const whole = scale ? absolute.slice(0, -scale) : absolute;
  const fraction = scale ? `.${absolute.slice(-scale)}` : "";
  return `${negative ? "-" : ""}${whole}${fraction}`;
}

export type TaxLine = {
  base: string;
  factorType: "Tasa" | "Cuota" | "Exento";
  rateOrQuota?: string;
  amount?: string;
};

export type CalculationFinding = { code: string; path: string; expected?: string; actual?: string; message: string };

export function validateTaxLine(tax: TaxLine, path: string, currencyDecimals = 2): CalculationFinding[] {
  const findings: CalculationFinding[] = [];
  const base = parseDecimal(tax.base);
  if (base.units <= 0n) findings.push({ code: "TAX_BASE_POSITIVE", path: `${path}.base`, message: "La base debe ser mayor a cero." });
  if (tax.factorType === "Exento") {
    if (tax.rateOrQuota !== undefined || tax.amount !== undefined) findings.push({ code: "EXEMPT_PROHIBITED_AMOUNT", path, message: "Exento no debe incluir tasa, cuota ni importe." });
    return findings;
  }
  if (!tax.rateOrQuota || tax.amount === undefined) {
    findings.push({ code: "TAX_REQUIRED_AMOUNT", path, message: "Tasa/Cuota requiere tasa o cuota e importe." });
    return findings;
  }
  const expected = formatDecimal(multiply(base, parseDecimal(tax.rateOrQuota)), currencyDecimals);
  const actual = formatDecimal(parseDecimal(tax.amount), currencyDecimals);
  if (actual !== expected) findings.push({ code: "TAX_AMOUNT_MISMATCH", path: `${path}.amount`, expected, actual, message: "El impuesto no coincide con base por tasa/cuota al redondeo de moneda." });
  return findings;
}

export function validateDocumentTotals(input: {
  concepts: Array<{ quantity: string; unitValue: string; amount: string; discount?: string; taxes: TaxLine[] }>;
  subtotal: string;
  discount?: string;
  transferredTaxes?: string;
  withheldTaxes?: string;
  total: string;
}, currencyDecimals = 2): CalculationFinding[] {
  const findings: CalculationFinding[] = [];
  input.concepts.forEach((concept, index) => {
    const expected = formatDecimal(multiply(parseDecimal(concept.quantity), parseDecimal(concept.unitValue)), currencyDecimals);
    const actual = formatDecimal(parseDecimal(concept.amount), currencyDecimals);
    if (expected !== actual) findings.push({ code: "CONCEPT_AMOUNT_MISMATCH", path: `concepts[${index}].amount`, expected, actual, message: "Cantidad por valor unitario no coincide con el importe." });
    concept.taxes.forEach((tax, taxIndex) => findings.push(...validateTaxLine(tax, `concepts[${index}].taxes[${taxIndex}]`, currencyDecimals)));
  });
  const subtotal = formatDecimal(add(...input.concepts.map(x => parseDecimal(x.amount))), currencyDecimals);
  if (subtotal !== formatDecimal(parseDecimal(input.subtotal), currencyDecimals)) findings.push({ code: "SUBTOTAL_MISMATCH", path: "subtotal", expected: subtotal, actual: input.subtotal, message: "Subtotal no coincide con la suma de conceptos." });
  const expectedTotal = add(
    parseDecimal(input.subtotal),
    parseDecimal(input.transferredTaxes ?? "0"),
    { ...parseDecimal(input.discount ?? "0"), units: -parseDecimal(input.discount ?? "0").units },
    { ...parseDecimal(input.withheldTaxes ?? "0"), units: -parseDecimal(input.withheldTaxes ?? "0").units },
  );
  const total = formatDecimal(expectedTotal, currencyDecimals);
  if (total !== formatDecimal(parseDecimal(input.total), currencyDecimals)) findings.push({ code: "TOTAL_MISMATCH", path: "total", expected: total, actual: input.total, message: "Total no coincide con subtotal menos descuentos más traslados menos retenciones." });
  return findings;
}
