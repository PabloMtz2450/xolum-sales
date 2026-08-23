import "server-only";
import { sha256 } from "../../domain/fiscal/production-readiness";
import { assertReadyToStamp, type FiscalArtifactEvidence } from "../../domain/fiscal/production-readiness";
import type { FinkokStampResult } from "../../domain/fiscal/finkok-client";
import { assertAuthorized, type SecurityContext } from "../security/authorization";

export type FiscalPreparation = {
  id: string;
  organizationId: string;
  status: "DRAFT" | "VALIDATING" | "READY" | "STAMPING" | "REJECTED" | "UNCERTAIN";
  payloadHash: string;
  signedXmlSha256?: string;
};

export interface FiscalTransaction {
  acquireIdempotency(input: { organizationId: string; scope: "STAMP"; key: string; requestHash: string }): Promise<"ACQUIRED" | "REPLAY" | "CONFLICT" | "IN_PROGRESS">;
  lockPreparation(input: { organizationId: string; preparationId: string }): Promise<FiscalPreparation>;
  transition(input: { preparationId: string; from: FiscalPreparation["status"][]; to: FiscalPreparation["status"] | "STAMPED" | "FAILED"; reason?: string }): Promise<void>;
  createAttempt(input: { preparationId: string; idempotencyKey: string; requestSha256: string; environment: "SANDBOX" | "PRODUCTION" }): Promise<number>;
  completeAttempt(input: { preparationId: string; attemptNumber: number; status: "STAMPED" | "REJECTED" | "UNCERTAIN" | "FAILED"; responseSha256?: string; uuid?: string; pacCode?: string; pacMessage?: string }): Promise<void>;
  completeIdempotency(input: { organizationId: string; scope: "STAMP"; key: string; responseHash?: string; status: "COMPLETED" | "REJECTED" | "UNCERTAIN" }): Promise<void>;
  appendAudit(input: { organizationId: string; actorUserId: string; action: string; resourceId: string; correlationId: string; payloadHash?: string }): Promise<void>;
}

export interface FiscalRepository {
  transaction<T>(work: (tx: FiscalTransaction) => Promise<T>): Promise<T>;
  getReplay(organizationId: string, key: string): Promise<{ uuid: string; stampedXmlSha256: string } | null>;
}

export interface FiscalXmlPipeline {
  buildUnsignedXml(preparationId: string, organizationId: string): Promise<string>;
  generateOriginalString(unsignedXml: string): Promise<string>;
  sign(unsignedXml: string, originalString: string): Promise<string>;
  validateXsd(xml: string): Promise<{ ok: boolean; errors: string[]; schemas: string[] }>;
  verifyLocalSeal(xml: string, originalString: string): Promise<boolean>;
  verifyStampedResponse(input: { sentXml: string; result: FinkokStampResult }): Promise<void>;
}

export interface ImmutableFiscalStorage {
  put(input: { organizationId: string; preparationId: string; type: "PRECFDI" | "STAMPED_XML" | "PAC_RESPONSE"; bytes: Uint8Array; sha256: string; contentType: string }): Promise<{ objectKey: string }>;
}

export interface StampPac {
  stamp(xml: string): Promise<FinkokStampResult>;
}

export interface ProductionEvidenceProvider {
  load(): Promise<FiscalArtifactEvidence>;
}

export type StampCommand = {
  context: SecurityContext;
  preparationId: string;
  idempotencyKey: string;
  correlationId: string;
  environment: "SANDBOX" | "PRODUCTION";
};

export class FiscalStampOrchestrator {
  constructor(
    private readonly repository: FiscalRepository,
    private readonly xml: FiscalXmlPipeline,
    private readonly storage: ImmutableFiscalStorage,
    private readonly pac: StampPac,
    private readonly readiness: ProductionEvidenceProvider,
  ) {}

  async execute(command: StampCommand) {
    assertAuthorized(command.context, "fiscal:stamp", command.context.organizationId);
    if (!/^[A-Za-z0-9:_-]{16,128}$/.test(command.idempotencyKey)) throw new Error("IDEMPOTENCY_KEY_INVALID");
    if (command.environment === "PRODUCTION") assertReadyToStamp(await this.readiness.load());

    const unsignedXml = await this.xml.buildUnsignedXml(command.preparationId, command.context.organizationId);
    const originalString = await this.xml.generateOriginalString(unsignedXml);
    const signedXml = await this.xml.sign(unsignedXml, originalString);
    const requestSha256 = sha256(signedXml);
    const xsd = await this.xml.validateXsd(signedXml);
    if (!xsd.ok) throw new Error(`XSD_REJECTED: ${xsd.errors.join(" | ")}`);
    if (!await this.xml.verifyLocalSeal(signedXml, originalString)) throw new Error("LOCAL_SEAL_VERIFICATION_FAILED");

    const preparation = await this.repository.transaction(async tx => {
      const idempotency = await tx.acquireIdempotency({
        organizationId: command.context.organizationId, scope: "STAMP",
        key: command.idempotencyKey, requestHash: requestSha256,
      });
      if (idempotency === "CONFLICT") throw new Error("IDEMPOTENCY_PAYLOAD_CONFLICT");
      if (idempotency === "IN_PROGRESS") throw new Error("STAMP_ALREADY_IN_PROGRESS");
      if (idempotency === "REPLAY") return null;
      const locked = await tx.lockPreparation({ organizationId: command.context.organizationId, preparationId: command.preparationId });
      if (locked.signedXmlSha256 !== requestSha256) throw new Error("LOCKED_SIGNED_XML_HASH_MISMATCH");
      await tx.transition({ preparationId: locked.id, from: ["READY"], to: "STAMPING" });
      await tx.appendAudit({ organizationId: locked.organizationId, actorUserId: command.context.userId, action: "FISCAL_STAMP_STARTED", resourceId: locked.id, correlationId: command.correlationId, payloadHash: requestSha256 });
      return locked;
    });

    if (!preparation) {
      const replay = await this.repository.getReplay(command.context.organizationId, command.idempotencyKey);
      if (!replay) throw new Error("IDEMPOTENCY_REPLAY_MISSING_RESULT");
      return { replay: true, ...replay };
    }

    let attemptNumber: number;
    try {
      await this.storage.put({
        organizationId: preparation.organizationId, preparationId: preparation.id, type: "PRECFDI",
        bytes: Buffer.from(signedXml, "utf8"), sha256: requestSha256, contentType: "application/xml",
      });
      attemptNumber = await this.repository.transaction(tx => tx.createAttempt({
        preparationId: preparation.id, idempotencyKey: command.idempotencyKey,
        requestSha256, environment: command.environment,
      }));
    } catch (error) {
      await this.repository.transaction(async tx => {
        await tx.transition({ preparationId: preparation.id, from: ["STAMPING"], to: "FAILED", reason: "PRE_PAC_PERSISTENCE_FAILED" });
        await tx.completeIdempotency({ organizationId: preparation.organizationId, scope: "STAMP", key: command.idempotencyKey, status: "REJECTED" });
      });
      throw error;
    }

    let result: FinkokStampResult;
    try {
      result = await this.pac.stamp(signedXml);
    } catch (error) {
      await this.repository.transaction(async tx => {
        await tx.completeAttempt({ preparationId: preparation.id, attemptNumber, status: "UNCERTAIN", pacMessage: error instanceof Error ? error.message : "PAC_TRANSPORT_ERROR" });
        await tx.transition({ preparationId: preparation.id, from: ["STAMPING"], to: "UNCERTAIN", reason: "PAC_RESULT_UNKNOWN" });
        await tx.completeIdempotency({ organizationId: preparation.organizationId, scope: "STAMP", key: command.idempotencyKey, status: "UNCERTAIN" });
      });
      throw new Error("STAMP_RESULT_UNCERTAIN_RECOVERY_REQUIRED");
    }

    if (!result.accepted) {
      const first = result.incidences[0];
      await this.repository.transaction(async tx => {
        await tx.completeAttempt({ preparationId: preparation.id, attemptNumber, status: "REJECTED", pacCode: first?.code, pacMessage: first?.message });
        await tx.transition({ preparationId: preparation.id, from: ["STAMPING"], to: "REJECTED", reason: first?.code });
        await tx.completeIdempotency({ organizationId: preparation.organizationId, scope: "STAMP", key: command.idempotencyKey, responseHash: result.responseSha256, status: "REJECTED" });
      });
      return { replay: false, accepted: false, incidences: result.incidences };
    }

    let stampedSha256: string;
    try {
      await this.xml.verifyStampedResponse({ sentXml: signedXml, result });
      stampedSha256 = sha256(result.stampedXml);
      await this.storage.put({
        organizationId: preparation.organizationId, preparationId: preparation.id, type: "STAMPED_XML",
        bytes: Buffer.from(result.stampedXml, "utf8"), sha256: stampedSha256, contentType: "application/xml",
      });
    } catch (error) {
      await this.repository.transaction(async tx => {
        await tx.completeAttempt({ preparationId: preparation.id, attemptNumber, status: "UNCERTAIN", uuid: result.uuid, pacMessage: error instanceof Error ? error.message : "PAC_RESPONSE_VERIFICATION_FAILED" });
        await tx.transition({ preparationId: preparation.id, from: ["STAMPING"], to: "UNCERTAIN", reason: "PAC_ACCEPTED_LOCAL_VERIFICATION_FAILED" });
        await tx.completeIdempotency({ organizationId: preparation.organizationId, scope: "STAMP", key: command.idempotencyKey, status: "UNCERTAIN" });
      });
      throw new Error("STAMP_ACCEPTED_BUT_LOCAL_VERIFICATION_FAILED");
    }
    await this.repository.transaction(async tx => {
      await tx.completeAttempt({ preparationId: preparation.id, attemptNumber, status: "STAMPED", responseSha256: stampedSha256, uuid: result.uuid });
      await tx.transition({ preparationId: preparation.id, from: ["STAMPING"], to: "STAMPED" });
      await tx.completeIdempotency({ organizationId: preparation.organizationId, scope: "STAMP", key: command.idempotencyKey, responseHash: stampedSha256, status: "COMPLETED" });
      await tx.appendAudit({ organizationId: preparation.organizationId, actorUserId: command.context.userId, action: "FISCAL_STAMP_COMPLETED", resourceId: preparation.id, correlationId: command.correlationId, payloadHash: stampedSha256 });
    });
    return { replay: false, accepted: true, uuid: result.uuid, stampedXmlSha256: stampedSha256 };
  }
}
