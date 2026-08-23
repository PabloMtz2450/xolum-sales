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

### Estado de certificación fiscal

El motor aplica validaciones preventivas y bloquea la habilitación productiva mientras no exista cobertura comprobada del 100% de la matriz CFDI 4.0, la matriz del complemento, XSD/catálogos vigentes, pruebas criptográficas, suite del PAC y una segunda revisión independiente. Consulta `docs/FISCAL-VALIDATION.md`.

## Integración con TMS

XOLUM Sales y TMS.dev permanecen separados. Sales enviará pedidos confirmados mediante una API versionada y recibirá eventos logísticos mediante webhooks firmados. Nunca accederá directamente a la base de datos del TMS.

El TMS es un módulo contratable por separado. Sin TMS conectado, Sales no ofrece tracking, ETA, POD ni validación automática de entrega.

## Desarrollo local

Requisitos: Node.js 22+, Docker Desktop y Git.

### Primera ejecución en Windows PowerShell

```powershell
git clone https://github.com/PabloMtz2450/xolum-sales.git
cd xolum-sales
Copy-Item .env.local.example .env
npm ci
docker compose up -d
npm run local:setup
npm run local:doctor
npm run dev
```

Abre:

- Aplicación: http://localhost:3000
- Inspector de datos ficticios: http://localhost:3000/demo-data
- Base de datos visual: ejecuta `npm run db:studio` y abre http://localhost:5555

### Usuarios ficticios

La semilla genera usuarios `OWNER`, `ADMIN`, `SALES_MANAGER`, `SALES_REP`, `CREDIT`, `INVENTORY`, `AUDITOR` y `VIEWER`. Todos usan temporalmente:

```text
Contraseña local: XolumDemo!2026
```

El seed muestra la lista completa en la terminal. Estas credenciales sólo existen para desarrollo local; no se habilitan en producción y todavía falta conectar la pantalla de inicio de sesión.

### Datos incluidos

- Dos empresas ficticias para probar aislamiento multiempresa.
- Ocho perfiles de usuario y sesiones demo.
- Cuatro clientes con RFC, contactos y direcciones ficticias.
- Cinco productos con claves SAT, precios, existencias y movimientos.
- Lista de precios, oportunidades, cotización y pedidos.
- Una preparación CFDI 4.0 en borrador con concepto e IVA.

### Reiniciar los datos

```powershell
npm run local:reset
```

El comando elimina exclusivamente la base configurada en `.env`, vuelve a aplicar migraciones y ejecuta el seed. Revisa siempre `DATABASE_URL` antes de usarlo.

### Detener PostgreSQL

```powershell
docker compose stop
```

Para eliminar también el volumen local de prueba:

```powershell
docker compose down -v
```

## Estado

Primera base funcional en construcción. No usar en producción hasta completar autenticación, persistencia, pruebas, controles fiscales e integración certificada.
