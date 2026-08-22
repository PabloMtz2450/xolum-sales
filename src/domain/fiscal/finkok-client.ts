import { createClientAsync, type Client } from "soap";
import { sha256 } from "./production-readiness";

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
    private readonly clientFactory: (wsdl: string) => Promise<Client> = async wsdl => {
      const [client] = await createClientAsync(wsdl, { disableCache: true });
      return client;
    },
  ) {
    if (!username || !password) throw new Error("FINKOK_CREDENTIALS_REQUIRED");
  }

  private async stampCall(method: "stampAsync" | "quick_stampAsync" | "stampedAsync", xml: string) {
    const client = await this.clientFactory(FINKOK_ENDPOINTS[this.environment].stamp);
    const operation = client[method] as ((args: Record<string, string>) => Promise<unknown>) | undefined;
    if (!operation) throw new Error(`FINKOK_WSDL_METHOD_MISSING: ${method}`);
    return operation.call(client, { xml, username: this.username, password: this.password });
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
}
