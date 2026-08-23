import { createClientAsync, type Client } from "soap";
import { sha256 } from "./production-readiness";
import { verifySignedCancellationXml } from "../../server/fiscal/secure-xml-verifier";

export const FINKOK_ENDPOINTS = {
  SANDBOX: {
    stamp: "https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl",
    cancel: "https://demo-facturacion.finkok.com/servicios/soap/cancel.wsdl",
  },
  PRODUCTION: {
    stamp: "https://facturacion.finkok.com/servicios/soap/stamp.wsdl",
    cancel: "https://facturacion.finkok.com/servicios/soap/cancel.wsdl",
  },
} as const;

type FinkokIncidence = { CodigoError?: string; MensajeIncidencia?: string; ExtraInfo?: string };
type RawStamp = {
  xml?: string;
  UUID?: string;
  Fecha?: string;
  CodEstatus?: string;
  SatSeal?: string;
  NoCertificadoSAT?: string;
  Incidencias?: { Incidencia?: FinkokIncidence | FinkokIncidence[] };
};

export type FinkokStampResult = {
  accepted: boolean;
  uuid: string;
  stampedXml: string;
  date: string;
  statusCode: string;
  satSeal: string;
  satCertificate: string;
  incidences: Array<{ code: string; message: string; extraInfo: string }>;
  requestSha256: string;
  responseSha256: string;
  recoveredFromPreviousStamp: boolean;
};

const first = <T>(value: T | T[]) => Array.isArray(value) ? value[0] : value;
const field = (value: unknown) => typeof value === "string" ? value : "";

export function parseFinkokStampResponse(rawResponse: unknown, requestSha256: string): FinkokStampResult {
  const envelope = first(rawResponse as unknown[]);
  const candidate = (envelope && typeof envelope === "object" ? envelope : {}) as Record<string, unknown>;
  const raw = (candidate.stampResult ?? candidate.quick_stampResult ?? candidate.stampedResult ?? candidate) as RawStamp;
  const incidenceValue = raw.Incidencias?.Incidencia;
  const incidenceArray = incidenceValue ? (Array.isArray(incidenceValue) ? incidenceValue : [incidenceValue]) : [];
  const incidences = incidenceArray.map(item => ({
    code: field(item.CodigoError),
    message: field(item.MensajeIncidencia),
    extraInfo: field(item.ExtraInfo),
  }));
  const stampedXml = field(raw.xml);
  const uuid = field(raw.UUID);
  return {
    accepted: Boolean(uuid && stampedXml && incidences.length === 0),
    uuid,
    stampedXml,
    date: field(raw.Fecha),
    statusCode: field(raw.CodEstatus),
    satSeal: field(raw.SatSeal),
    satCertificate: field(raw.NoCertificadoSAT),
    incidences,
    requestSha256,
    responseSha256: stampedXml ? sha256(stampedXml) : "",
    recoveredFromPreviousStamp: false,
  };
}

export class FinkokClient {
  constructor(
    private readonly username: string,
    private readonly password: string,
    private readonly environment: keyof typeof FINKOK_ENDPOINTS = "SANDBOX",
    private readonly timeoutMs = 15_000,
    private readonly clientFactory: (wsdl: string) => Promise<Client> = async wsdl => {
      return createClientAsync(wsdl, { disableCache: true, wsdl_options: { timeout: 10_000 } });
    },
  ) {
    if (!username || !password) throw new Error("FINKOK_CREDENTIALS_REQUIRED");
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 60_000) throw new Error("FINKOK_TIMEOUT_INVALID");
  }

  private withTimeout<T>(operation: Promise<T>, code: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(code)), this.timeoutMs);
      operation.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
    });
  }

  private async stampCall(method: "stampAsync" | "quick_stampAsync" | "stampedAsync", xml: string) {
    const client = await this.clientFactory(FINKOK_ENDPOINTS[this.environment].stamp);
    const operation = (client as unknown as Record<string, unknown>)[method] as ((args: Record<string, string>) => Promise<unknown>) | undefined;
    if (!operation) throw new Error(`FINKOK_WSDL_METHOD_MISSING: ${method}`);
    return this.withTimeout(operation.call(client, { xml, username: this.username, password: this.password }), "FINKOK_STAMP_TIMEOUT");
  }

  async stamp(xml: string): Promise<FinkokStampResult> {
    const requestSha256 = sha256(xml);
    let result = parseFinkokStampResponse(await this.stampCall("stampAsync", xml), requestSha256);
    const duplicate = result.incidences.some(item => item.code === "307");
    if (duplicate && !result.uuid) {
      await new Promise(resolve => setTimeout(resolve, 200));
      result = parseFinkokStampResponse(await this.stampCall("stampedAsync", xml), requestSha256);
      result.recoveredFromPreviousStamp = Boolean(result.uuid && result.stampedXml);
      result.accepted = result.recoveredFromPreviousStamp && result.incidences.length === 0;
    }
    return result;
  }

  async quickStamp(xml: string) {
    return parseFinkokStampResponse(await this.stampCall("quick_stampAsync", xml), sha256(xml));
  }

  private async cancelCall(method: "cancel_signatureAsync" | "get_sat_statusAsync", args: Record<string, string | boolean>) {
    const client = await this.clientFactory(FINKOK_ENDPOINTS[this.environment].cancel);
    const operation = (client as unknown as Record<string, unknown>)[method] as ((parameters: Record<string, string | boolean>) => Promise<unknown>) | undefined;
    if (!operation) throw new Error(`FINKOK_WSDL_METHOD_MISSING: ${method}`);
    return this.withTimeout(operation.call(client, { ...args, username: this.username, password: this.password }), "FINKOK_CANCEL_TIMEOUT");
  }

  async cancelSigned(signedCancellationXml: string, storePending = false) {
    verifySignedCancellationXml(signedCancellationXml);
    return this.cancelCall("cancel_signatureAsync", { xml: signedCancellationXml, store_pending: storePending });
  }

  async getSatStatus(input: { issuerRfc: string; receiverRfc: string; uuid: string; total: string }) {
    return this.cancelCall("get_sat_statusAsync", {
      taxpayer_id: input.issuerRfc,
      rtaxpayer_id: input.receiverRfc,
      uuid: input.uuid,
      total: input.total,
    });
  }
}
