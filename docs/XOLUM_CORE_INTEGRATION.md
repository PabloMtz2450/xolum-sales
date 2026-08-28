# XOLUM Sales → Universal Core

Sales remains owner of quotations and sales orders. Core owns canonical tenant/organization/product identities and the event transport contract.

When an order reaches the confirmed state, Sales builds `sales.order.confirmed.v1` through `src/integration/xolum-core.ts` and publishes it to Core with a tenant-bound service token and a stable idempotency key such as `sales:<order-id>:confirmed`.

Required guarantees:
- `tenant_id` comes from the authenticated Sales tenant context, never free user input.
- customer, ship-to and product IDs are canonical Core IDs.
- retries reuse event ID and idempotency key for the same logical confirmation.
- Sales does not write TMS or Fiscal databases.
- downstream failure does not silently rewrite the confirmed Sales order; retry/outbox state is explicit.
- customer material codes remain line-level references and do not replace canonical `product_id`.

The next persistence step is to invoke this adapter from the Sales transactional outbox when the existing order-confirmation transaction commits. The adapter is intentionally isolated so current Sales behavior remains reversible while integration is validated.
