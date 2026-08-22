import { describe, expect, it } from "vitest";
import { FINKOK_ENDPOINTS, parseFinkokStampResponse } from "./finkok-client";

describe("Finkok SOAP integration", () => {
  it("pins official sandbox and production WSDLs", () => {
    expect(FINKOK_ENDPOINTS.SANDBOX.stamp).toContain("demo-facturacion.finkok.com");
    expect(FINKOK_ENDPOINTS.PRODUCTION.stamp).toContain("facturacion.finkok.com");
    expect(FINKOK_ENDPOINTS.SANDBOX.cancel).toEndWith("/cancel.wsdl");
  });

  it("normalizes a successful stamp response", () => {
    const result = parseFinkokStampResponse([{
      stampResult: {
        xml: "<cfdi/>", UUID: "11111111-1111-4111-8111-111111111111",
        Fecha: "2026-08-22T12:00:00", CodEstatus: "Comprobante timbrado satisfactoriamente",
        SatSeal: "seal", NoCertificadoSAT: "000010000001",
      },
    }], "request-hash");
    expect(result.accepted).toBe(true);
    expect(result.uuid).toBe("11111111-1111-4111-8111-111111111111");
    expect(result.requestSha256).toBe("request-hash");
    expect(result.responseSha256).not.toBe("");
  });

  it("normalizes all Finkok incidences and blocks acceptance", () => {
    const result = parseFinkokStampResponse([{
      stampResult: {
        Incidencias: { Incidencia: [
          { CodigoError: "CFDI40101", MensajeIncidencia: "Error fiscal" },
          { CodigoError: "307", MensajeIncidencia: "El CFDI contiene un timbre previo" },
        ] },
      },
    }], "request-hash");
    expect(result.accepted).toBe(false);
    expect(result.incidences.map(x => x.code)).toEqual(["CFDI40101", "307"]);
  });
});
