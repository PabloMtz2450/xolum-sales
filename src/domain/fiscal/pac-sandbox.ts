import { sha256 } from "./production-readiness";

export type PacPreflightRequest = {
  xml: string;
  idempotencyKey: string;
  expectedSha256: string;
};

export type PacPreflightResult = {
  provider: string;
  accepted: boolean;
  code?: string;
  message?: string;
  sentSha256: string;
  receivedAt: string;
};

export interface PacSandboxAdapter {
  readonly provider: string;
  preflight(request: PacPreflightRequest): Promise<PacPreflightResult>;
}

export class HttpPacSandboxAdapter implements PacSandboxAdapter {
  constructor(
    readonly provider: string,
    private readonly endpoint: string,
    private readonly token: string,
    private readonly timeoutMs = 30_000,
  ) {}

  async preflight(request: PacPreflightRequest): Promise<PacPreflightResult> {
    const sentSha256 = sha256(request.xml);
    if (sentSha256 !== request.expectedSha256) throw new Error("PAC_XML_HASH_MISMATCH_BEFORE_SEND");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/xml; charset=utf-8",
          "idempotency-key": request.idempotencyKey,
          "x-xolum-xml-sha256": sentSha256,
        },
        body: request.xml,
        signal: controller.signal,
      });
      const body = await response.text();
      let parsed: { accepted?: boolean; code?: string; message?: string } = {};
      try { parsed = JSON.parse(body); } catch { parsed = { message: body.slice(0, 500) }; }
      return {
        provider: this.provider,
        accepted: response.ok && parsed.accepted !== false,
        code: parsed.code,
        message: parsed.message,
        sentSha256,
        receivedAt: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
