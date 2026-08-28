import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const uuidLike = z.string().min(16).max(64);
const lineSchema = z.object({
  line_id: z.string().min(1).max(128),
  product_id: uuidLike,
  quantity: z.number().positive(),
  unit_code: z.string().min(1).max(32),
  customer_product_code: z.string().max(160).nullable().optional(),
}).strict();

export const salesOrderConfirmedPayloadSchema = z.object({
  sales_order_id: z.string().min(1).max(128),
  customer_organization_id: uuidLike,
  ship_to_address_id: z.string().max(64).nullable().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  purchase_order_reference: z.string().max(160).nullable().optional(),
  lines: z.array(lineSchema).min(1).max(10_000),
}).strict();

export type SalesOrderConfirmedPayload = z.infer<typeof salesOrderConfirmedPayloadSchema>;

export type XolumEvent<T> = {
  event_id: string;
  event_type: string;
  schema_version: '1.0';
  occurred_at: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  correlation_id: string;
  payload: T;
};

export function buildSalesOrderConfirmedEvent(input: {
  tenantId: string;
  correlationId: string;
  payload: SalesOrderConfirmedPayload;
  eventId?: string;
  occurredAt?: string;
}): XolumEvent<SalesOrderConfirmedPayload> {
  const payload = salesOrderConfirmedPayloadSchema.parse(input.payload);
  return {
    event_id: input.eventId ?? randomUUID(),
    event_type: 'sales.order.confirmed.v1',
    schema_version: '1.0',
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    tenant_id: input.tenantId,
    entity_type: 'sales_order',
    entity_id: payload.sales_order_id,
    correlation_id: input.correlationId,
    payload,
  };
}

export async function publishSalesOrderConfirmed(args: {
  coreUrl: string;
  serviceToken: string;
  idempotencyKey: string;
  event: XolumEvent<SalesOrderConfirmedPayload>;
  fetcher?: typeof fetch;
}) {
  if (!args.idempotencyKey) throw new Error('IDEMPOTENCY_KEY_REQUIRED');
  const fetcher = args.fetcher ?? fetch;
  const response = await fetcher(`${args.coreUrl.replace(/\/$/, '')}/api/v1/events`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-service-token': args.serviceToken,
      'idempotency-key': args.idempotencyKey,
      'x-request-id': args.event.correlation_id,
    },
    body: JSON.stringify(args.event),
  });
  if (response.status !== 200 && response.status !== 202) throw new Error(`XOLUM_CORE_EVENT_REJECTED_${response.status}`);
  return response.json() as Promise<{duplicate:boolean;event:{id:string;event_type:string;correlation_id:string}}>;
}
