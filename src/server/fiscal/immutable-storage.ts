import "server-only";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type ImmutableObjectInput = {
  organizationId: string;
  preparationId: string;
  type: "PRECFDI" | "STAMPED_XML" | "PDF" | "CANCELLATION_ACK" | "PAC_REQUEST" | "PAC_RESPONSE" | "ORIGINAL_STRING";
  bytes: Uint8Array;
  sha256: string;
  contentType: string;
};

const safeSegment = (value: string) => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("OBJECT_KEY_SEGMENT_INVALID");
  return value;
};

export class S3ImmutableFiscalStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly kmsKeyId: string,
    private readonly retentionDays = 3650,
  ) {
    if (!bucket || !kmsKeyId) throw new Error("IMMUTABLE_STORAGE_CONFIGURATION_REQUIRED");
  }

  async put(input: ImmutableObjectInput) {
    const organizationId = safeSegment(input.organizationId);
    const preparationId = safeSegment(input.preparationId);
    if (!/^[a-f0-9]{64}$/.test(input.sha256)) throw new Error("ARTIFACT_SHA256_INVALID");
    const objectKey = `fiscal/${organizationId}/${preparationId}/${input.type.toLowerCase()}/${input.sha256}`;
    const checksum = Buffer.from(input.sha256, "hex").toString("base64");
    const retainUntil = new Date(Date.now() + this.retentionDays * 86_400_000);

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      Body: input.bytes,
      ContentType: input.contentType,
      ChecksumSHA256: checksum,
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: this.kmsKeyId,
      ObjectLockMode: "COMPLIANCE",
      ObjectLockRetainUntilDate: retainUntil,
      Metadata: {
        organization: organizationId,
        preparation: preparationId,
        artifact_type: input.type,
        sha256: input.sha256,
      },
    }));
    return { objectKey, retainUntil };
  }
}
