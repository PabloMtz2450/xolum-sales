export const SAT_XSD_REGISTRY = {
  CFDI_40: {
    namespace: "http://www.sat.gob.mx/cfd/4",
    url: "https://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd",
    requiredFor: ["I", "E", "T", "P"],
  },
  PAGOS_20: {
    namespace: "http://www.sat.gob.mx/Pagos20",
    url: "https://www.sat.gob.mx/sitio_internet/cfd/Pagos/Pagos20.xsd",
    requiredFor: ["P"],
  },
  DETALLISTA_13: {
    namespace: "http://www.sat.gob.mx/detallista",
    url: "https://www.sat.gob.mx/sitio_internet/cfd/detallista/detallista.xsd",
    requiredFor: ["I", "E"],
  },
  CARTA_PORTE_31: {
    namespace: "http://www.sat.gob.mx/CartaPorte31",
    url: "https://www.sat.gob.mx/sitio_internet/cfd/CartaPorte/CartaPorte31.xsd",
    requiredFor: ["I", "T"],
  },
  COMERCIO_EXTERIOR_20: {
    namespace: "http://www.sat.gob.mx/ComercioExterior20",
    url: "https://www.sat.gob.mx/sitio_internet/cfd/ComercioExterior20/ComercioExterior20.xsd",
    requiredFor: ["I"],
  },
} as const;

export const CFDI40_ORIGINAL_STRING_XSLT =
  "https://www.sat.gob.mx/sitio_internet/cfd/4/cadenaoriginal_4_0/cadenaoriginal_4_0.xslt";

export type XsdArtifact = {
  key: keyof typeof SAT_XSD_REGISTRY;
  url: string;
  localPath: string;
  sha256: string;
  fetchedAt: string;
};

export function requiredSchemas(voucherType: "I" | "E" | "T" | "P", complements: string[]) {
  const keys = (Object.keys(SAT_XSD_REGISTRY) as Array<keyof typeof SAT_XSD_REGISTRY>)
    .filter(key => SAT_XSD_REGISTRY[key].requiredFor.some(type => type === voucherType))
    .filter(key => key === "CFDI_40" || complements.includes(key));
  if (voucherType === "P" && !keys.includes("PAGOS_20")) keys.push("PAGOS_20");
  return keys;
}

export function assertSchemaEvidence(input: {
  voucherType: "I" | "E" | "T" | "P";
  complements: string[];
  validated: Partial<Record<keyof typeof SAT_XSD_REGISTRY, boolean>>;
}) {
  const missing = requiredSchemas(input.voucherType, input.complements).filter(key => input.validated[key] !== true);
  if (missing.length) throw new Error(`XSD_VALIDATION_REQUIRED: ${missing.join(",")}`);
}
