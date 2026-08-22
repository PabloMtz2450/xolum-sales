# XOLUM Sales

**Menos captura. Más ventas.**

XOLUM Sales es el núcleo comercial modular de XOLUM para administrar clientes, datos fiscales, contactos, direcciones de entrega, CRM, catálogo, inventario, cotizaciones y pedidos.

## Principios

- Soluciones que realmente ayudan.
- Diseñamos alrededor de problemas reales.
- Automatizamos lo repetitivo.
- Conectamos lo que está separado.
- Simplificamos lo complicado.
- Si no simplifica, no sirve.

## Alcance inicial

- Expediente 360° de clientes.
- Datos fiscales CFDI 4.0 separados de direcciones logísticas.
- CRM y pipeline comercial.
- Catálogo con datos comerciales, fiscales y logísticos.
- Inventario multi-almacén y disponibilidad para promesa.
- Cotizaciones y pedidos sin recaptura.
- Snapshot fiscal inmutable preparado para CFDI 4.0.
- OC, posición y código de cliente conservados por concepto.
- Complementos versionados, comenzando por Detallista 1.3.
- Addendas separadas como producto independiente.
- Integration Hub preparado para ERP, XOLUM TMS y XOLUM Fiscal.
- Multiempresa, roles y auditoría desde origen.

## Integración con TMS

## Preparación para facturación

Sales no timbra ni permite reconstruir manualmente la factura. Al liberar un pedido crea un snapshot fiscal validado y bloqueado, listo para que XOLUM Fiscal lo transforme a XML CFDI 4.0 y lo envíe al PAC.

Consulta `docs/CFDI-40-HANDOFF.md` y `docs/INVOICE-PREPARATION-API.md`.

## Integración con TMS

XOLUM Sales y TMS.dev permanecen separados. Sales enviará pedidos confirmados mediante una API versionada y recibirá eventos logísticos mediante webhooks firmados. Nunca accederá directamente a la base de datos del TMS.

El TMS es un módulo contratable por separado. Sin TMS conectado, Sales no ofrece tracking, ETA, POD ni validación automática de entrega.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Estado

Primera base funcional en construcción. No usar en producción hasta completar autenticación, persistencia, pruebas, controles fiscales e integración certificada.
