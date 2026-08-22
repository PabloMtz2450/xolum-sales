# Arquitectura de XOLUM Sales

## Principios

1. Multiempresa desde origen.
2. Monolito modular antes de microservicios.
3. API-first e integraciones mediante adaptadores.
4. Separación estricta entre datos fiscales y direcciones logísticas.
5. No duplicar captura entre cotización, pedido, TMS y facturación.
6. Seguridad por rol, campo y organización.
7. Toda modificación sensible queda auditada.
8. La interfaz muestra decisiones; la complejidad permanece dentro del sistema.

## Dominios

IAM, Organizations, Customers, Fiscal Profiles, Contacts, Addresses, CRM, Catalog, Pricing, Inventory, Quotes, Orders, Credit, Approvals, Documents, Integrations, Audit y Reporting.

## Flujo maestro

Prospecto → oportunidad → cotización → aprobación → pedido → inventario/crédito → preparación → TMS opcional → POD → XOLUM Fiscal opcional.

## Límites de los productos

- **Sales** es dueño del cliente comercial, catálogo, precio, cotización y pedido.
- **TMS** es dueño del embarque, ruta, tracking, parada, evidencia y POD.
- **Fiscal** es dueño del CFDI, timbrado, cancelación, REP y conciliación fiscal.
- Un ERP puede ser maestro de cualquiera de estas entidades mediante configuración explícita.
