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
- Integration Hub preparado para ERP, XOLUM TMS y XOLUM Fiscal.
- Multiempresa, roles y auditoría desde origen.

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
