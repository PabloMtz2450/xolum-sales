# API de preparación de factura

## Crear snapshot

`POST /api/v1/orders/{orderId}/invoice-preparations`

Crea una versión fiscal desde el pedido. La operación requiere `Idempotency-Key`.

## Validar

`POST /api/v1/invoice-preparations/{id}/validate`

Ejecuta reglas comerciales y fiscales previas. Devuelve errores estables con ruta, código y mensaje humano.

## Bloquear

`POST /api/v1/invoice-preparations/{id}/lock`

Calcula el hash canónico y vuelve inmutable la versión. Solo una versión bloqueada puede enviarse a XOLUM Fiscal.

## Enviar

`POST /api/v1/invoice-preparations/{id}/submit`

Envía el paquete a XOLUM Fiscal. La respuesta se guarda con correlation ID, intento, estado y error.

## Reglas

- No timbrar desde una cotización.
- No enviar conceptos sin clave SAT, unidad SAT y ObjetoImp.
- No permitir importes calculados manualmente en la pantalla de facturación.
- No cambiar el receptor después del bloqueo.
- No concatenar UUID relacionados.
- No agregar un complemento únicamente porque un cliente lo solicite: debe corresponder fiscalmente a la operación.
- Detallista y addenda pueden coexistir, pero permanecen en secciones independientes.
