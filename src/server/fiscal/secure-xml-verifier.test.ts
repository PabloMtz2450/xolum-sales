import { describe, expect, it, vi } from "vitest";
import { CryptographicFinkokResponseVerifier, verifySignedCancellationXml } from "./secure-xml-verifier";

const sent = `<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" SubTotal="100.00" Moneda="MXN" Total="116.00" TipoDeComprobante="I" Exportacion="01" LugarExpedicion="01000" NoCertificado="123" Sello="CFD"><cfdi:Emisor Rfc="AAA010101AAA"/><cfdi:Receptor Rfc="BBB010101BBB"/></cfdi:Comprobante>`;
const stamped = `<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" SubTotal="100.00" Moneda="MXN" Total="116.00" TipoDeComprobante="I" Exportacion="01" LugarExpedicion="01000" NoCertificado="123" Sello="CFD"><cfdi:Emisor Rfc="AAA010101AAA"/><cfdi:Receptor Rfc="BBB010101BBB"/><cfdi:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" UUID="11111111-1111-4111-8111-111111111111" SelloCFD="CFD" SelloSAT="SAT" NoCertificadoSAT="999"/></cfdi:Complemento></cfdi:Comprobante>`;

describe("fiscal XML hardening", () => {
  it("rejects DTD/entity payloads before XMLDSig processing", () => {
    expect(() => verifySignedCancellationXml(`<!DOCTYPE x [<!ENTITY e "boom">]><x>&e;</x>`)).toThrow(/DTD_FORBIDDEN/);
  });

  it("rejects inconsistent PAC UUID before certificate resolution", async () => {
    const resolver = vi.fn();
    const verifier = new CryptographicFinkokResponseVerifier(resolver, vi.fn());
    await expect(verifier.verify({ sentXml: sent, result: {
      accepted: true, uuid: "22222222-2222-4222-8222-222222222222", stampedXml: stamped,
      date: "", statusCode: "", satSeal: "SAT", satCertificate: "999", incidences: [],
      requestSha256: "", responseSha256: "", recoveredFromPreviousStamp: false,
    } })).rejects.toThrow(/UUID_MISMATCH/);
    expect(resolver).not.toHaveBeenCalled();
  });
});
