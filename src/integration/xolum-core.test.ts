import { describe, expect, it, vi } from 'vitest';
import { buildSalesOrderConfirmedEvent, publishSalesOrderConfirmed } from './xolum-core';

const payload = {
  sales_order_id: 'SO-0001',
  customer_organization_id: '019c89aa-1111-4111-8111-111111111111',
  ship_to_address_id: '019c89aa-2222-4222-8222-222222222222',
  currency: 'MXN',
  purchase_order_reference: 'OC-1000',
  lines: [{line_id:'10',product_id:'019c89aa-3333-4333-8333-333333333333',quantity:2,unit_code:'H87',customer_product_code:'855630034'}],
};

describe('XOLUM Core Sales adapter', () => {
  it('builds the strict canonical event', () => {
    const event=buildSalesOrderConfirmedEvent({tenantId:'019c89aa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',correlationId:'corr-1',payload,eventId:'019c89aa-bbbb-4bbb-8bbb-bbbbbbbbbbbb',occurredAt:'2026-08-28T12:00:00.000Z'});
    expect(event.event_type).toBe('sales.order.confirmed.v1');
    expect(event.entity_id).toBe('SO-0001');
    expect(event.payload.lines[0].customer_product_code).toBe('855630034');
  });

  it('rejects non canonical currency and missing product ids', () => {
    expect(() => buildSalesOrderConfirmedEvent({tenantId:'tenant',correlationId:'c',payload:{...payload,currency:'mxn'}})).toThrow();
    expect(() => buildSalesOrderConfirmedEvent({tenantId:'tenant',correlationId:'c',payload:{...payload,lines:[{line_id:'10',product_id:'x',quantity:1,unit_code:'H87'}]}})).toThrow();
  });

  it('publishes with service auth and idempotency', async () => {
    const fetcher=vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({'x-service-token':'tenant.secret','idempotency-key':'sales:SO-0001:confirmed'});
      return new Response(JSON.stringify({duplicate:false,event:{id:'event-1',event_type:'sales.order.confirmed.v1',correlation_id:'corr-1'}}),{status:202,headers:{'content-type':'application/json'}});
    });
    const event=buildSalesOrderConfirmedEvent({tenantId:'019c89aa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',correlationId:'corr-1',payload});
    const result=await publishSalesOrderConfirmed({coreUrl:'https://api.xolum.test/',serviceToken:'tenant.secret',idempotencyKey:'sales:SO-0001:confirmed',event,fetcher:fetcher as typeof fetch});
    expect(result.duplicate).toBe(false);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
