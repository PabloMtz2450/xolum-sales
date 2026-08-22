/**
 * @deprecated Use the canonical governed validator in
 * src/domain/fiscal/prestamp-validation.ts.
 *
 * This compatibility module intentionally contains no fiscal rules to prevent
 * two sources of truth.
 */
export {
  PRESTAMP_LAYERS,
  PRESTAMP_RULES,
  VALIDATION_PROFILES,
  validateBeforeStamping,
  classifyPacRejection,
} from "./fiscal/prestamp-validation";

export type {
  PrestampLayer,
  VoucherProfile,
  VersionedFiscalRule,
  ValidationContext,
  PrestampFinding,
  PacRejection,
} from "./fiscal/prestamp-validation";
