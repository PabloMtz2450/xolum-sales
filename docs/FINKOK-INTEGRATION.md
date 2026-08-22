# Integración Finkok para XOLUM Fiscal

Fecha de revisión: 2026-08-22  
Proveedor PAC: Finkok  
Política: el timbrado permanece bloqueado hasta aprobar el sandbox con credenciales propias y el mismo XML validado, sellado y enviado.

## Endpoints oficiales

| Servicio | Sandbox | Producción |
|---|---|---|
| Timbrado | https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl | https://facturacion.finkok.com/servicios/soap/stamp.wsdl |
| Cancelación/estado SAT | https://demo-facturacion.finkok.com/servicios/soap/cancel.wsdl | https://facturacion.finkok.com/servicios/soap/cancel.wsdl |

La aplicación debe iniciar siempre con `PAC_ENVIRONMENT=SANDBOX`. Producción no se habilita por omisión.

## Operaciones adoptadas

- `stamp`: operación normal de timbrado.
- `stamped`: recuperación de un CFDI previamente timbrado cuando Finkok devuelve incidencia 307 sin UUID/XML.
- `quick_stamp`: disponible, pero no se utilizará como flujo principal.
- `cancel_signature`: cancelación mediante solicitud XML firmada localmente.
- `get_sat_status`: consulta del estado SAT usando RFC emisor, RFC receptor, UUID y total.

No se usarán métodos que transmitan la llave privada o contraseña del CSD. XOLUM genera cadena, sello y solicitudes firmadas localmente.

## Flujo obligatorio

1. Congelar snapshot fiscal.
2. Generar XML CFDI 4.0 determinista.
3. Ejecutar nueve capas XOLUM.
4. Validar CFDI y complementos contra XSD oficiales.
5. Generar cadena original con XSLT SAT.
6. Firmar localmente con CSD.
7. Verificar certificado, RFC, vigencia, llave pública, cadena y sello.
8. Calcular SHA-256 del XML final.
9. Enviar esos mismos bytes mediante `stamp`.
10. Normalizar `UUID`, `xml`, `Fecha`, `CodEstatus`, `SatSeal`, `NoCertificadoSAT` e `Incidencias`.
11. Verificar TimbreFiscalDigital, sello SAT y persistir XML inmutable.
12. Ante 307 sin XML/UUID, esperar 200 ms y consultar `stamped`; nunca generar automáticamente un CFDI distinto.
13. Convertir toda incidencia determinista en regla y prueba de regresión.

## Pruebas de aceptación sandbox

Deben aprobarse por separado:

- I: PUE, PPD, IVA 16/0/exento, IEPS, retenciones, descuentos, moneda extranjera y relaciones.
- E: devolución, descuento, relación 01 y sustitución 04.
- T: total/subtotal cero, sin forma ni método de pago, con y sin Carta Porte cuando corresponda.
- P: Pagos 2.0, parcialidades, multimoneda, equivalencias, impuestos y totales.
- Complementos: Pagos 2.0, Detallista 1.3, Carta Porte 3.1 y Comercio Exterior 2.0.
- Rechazos: RFC, nombre/CP/régimen, catálogos vencidos, cálculos, UUID concatenados, CSD vencido/no coincidente y XML/XSD inválido.
- Resiliencia: timeout, SOAP Fault, respuesta incompleta, incidencia 307, duplicidad e idempotencia.
- Cancelación: motivos 01/02/03/04, folio sustituto cuando aplique, cancelación firmada y consulta posterior de estado.

## Evidencias requeridas

Por cada caso se conserva: identificador, perfil, XML previo, hash enviado, respuesta SOAP sanitizada, código Finkok/SAT, UUID, XML timbrado, fecha, resultado esperado, resultado real y versión de reglas.

## Variables secretas

- `FINKOK_USERNAME`
- `FINKOK_PASSWORD`
- `CSD_PRIVATE_KEY_PASSWORD`

Nunca se registran en Git, logs, errores, capturas ni telemetría. Los XML de pruebas no deben contener CSD productivos ni datos personales reales.

## Criterio de liberación

Producción solo se habilita si:

- matrices CFDI/REP completas con pruebas positivas y negativas;
- XSD y criptografía aprobados;
- corpus completo;
- sandbox Finkok aceptado;
- hash preflight igual al XML enviado;
- cancelación y consulta SAT comprobadas;
- primera y segunda revisión aprobadas.
