import { createPublicKey, verify, X509Certificate } from "node:crypto";
import { DOMParser } from "@xmldom/xmldom";
import xpath from "xpath";
import { SignedXml } from "xml-crypto";
import type { FinkokStampResult } from "../../domain/fiscal/finkok-client";

const MAX_XML_BYTES = 10 * 1024 * 1024;

function parseXml(xml: string) {
  if (Buffer.byteLength(xml, "utf8") > MAX_XML_BYTES) throw new Error("XML_SIZE_LIMIT_EXCEEDED");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("XML_DTD_FORBIDDEN");
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (!document.documentElement || document.documentElement.nodeName === "parsererror") throw new Error("XML_PARSE_FAILED");
  return document;
}

type XmlElement = { getAttribute(name: string): string | null };
const node = (expression: string, document: unknown) => xpath.select1(expression, document as never) as unknown as XmlElement | undefined;
const attr = (element: XmlElement | undefined, name: string) => element?.getAttribute(name) ?? "";

export type SatCertificateResolver = (certificateNumber: string) => Promise<string>;
export type TfdOriginalStringBuilder = (tfd: XmlElement) => Promise<string>;

export class CryptographicFinkokResponseVerifier {
  constructor(
    private readonly resolveSatCertificate: SatCertificateResolver,
    private readonly buildTfdOriginalString: TfdOriginalStringBuilder,
  ) {}

  async verify(input: { sentXml: string; result: FinkokStampResult }) {
    const sent = parseXml(input.sentXml);
    const stamped = parseXml(input.result.stampedXml);
    const sentCfdi = node("/*[local-name()='Comprobante']", sent);
    const stampedCfdi = node("/*[local-name()='Comprobante']", stamped);
    const tfd = node("//*[local-name()='TimbreFiscalDigital']", stamped);
    if (!sentCfdi || !stampedCfdi || !tfd) throw new Error("PAC_RESPONSE_REQUIRED_NODES_MISSING");

    const immutableAttributes = ["Version", "Serie", "Folio", "Fecha", "SubTotal", "Descuento", "Moneda", "Total", "TipoDeComprobante", "Exportacion", "MetodoPago", "FormaPago", "LugarExpedicion", "NoCertificado", "Sello"];
    for (const name of immutableAttributes) {
      if (attr(sentCfdi, name) !== attr(stampedCfdi, name)) throw new Error(`PAC_RESPONSE_ATTRIBUTE_MISMATCH:${name}`);
    }
    const sentIssuer = node("/*[local-name()='Comprobante']/*[local-name()='Emisor']", sent);
    const stampedIssuer = node("/*[local-name()='Comprobante']/*[local-name()='Emisor']", stamped);
    const sentReceiver = node("/*[local-name()='Comprobante']/*[local-name()='Receptor']", sent);
    const stampedReceiver = node("/*[local-name()='Comprobante']/*[local-name()='Receptor']", stamped);
    if (attr(sentIssuer, "Rfc") !== attr(stampedIssuer, "Rfc") || attr(sentReceiver, "Rfc") !== attr(stampedReceiver, "Rfc")) {
      throw new Error("PAC_RESPONSE_TAXPAYER_MISMATCH");
    }
    if (attr(tfd, "UUID").toUpperCase() !== input.result.uuid.toUpperCase()) throw new Error("PAC_RESPONSE_UUID_MISMATCH");
    if (attr(tfd, "SelloCFD") !== attr(sentCfdi, "Sello")) throw new Error("PAC_RESPONSE_CFD_SEAL_MISMATCH");
    if (attr(tfd, "SelloSAT") !== input.result.satSeal || attr(tfd, "NoCertificadoSAT") !== input.result.satCertificate) throw new Error("PAC_RESPONSE_SAT_FIELDS_MISMATCH");

    const certificatePem = await this.resolveSatCertificate(attr(tfd, "NoCertificadoSAT"));
    const certificate = new X509Certificate(certificatePem);
    const originalString = await this.buildTfdOriginalString(tfd);
    const valid = verify("RSA-SHA256", Buffer.from(originalString, "utf8"), certificate.publicKey, Buffer.from(attr(tfd, "SelloSAT"), "base64"));
    if (!valid) throw new Error("PAC_RESPONSE_SAT_SEAL_INVALID");
  }
}

export function verifySignedCancellationXml(xml: string) {
  const document = parseXml(xml);
  const signature = node("//*[local-name()='Signature']", document);
  const certificateBase64 = xpath.select("string(//*[local-name()='X509Certificate'][1])", document as never) as string;
  if (!signature || !certificateBase64.trim()) throw new Error("CANCELLATION_XML_SIGNATURE_MISSING");
  const pem = `-----BEGIN CERTIFICATE-----\n${certificateBase64.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") ?? ""}\n-----END CERTIFICATE-----`;
  const certificate = new X509Certificate(pem);
  createPublicKey(certificate.publicKey);
  const verifier = new SignedXml({ publicCert: pem });
  verifier.loadSignature(signature as never);
  if (!verifier.checkSignature(xml)) throw new Error("CANCELLATION_XML_SIGNATURE_INVALID");
  return { certificate, document };
}
