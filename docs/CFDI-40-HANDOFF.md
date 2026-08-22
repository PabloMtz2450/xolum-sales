# Preparación fiscal CFDI 4.0

## Responsabilidad

XOLUM Sales captura, valida y congela la intención comercial. XOLUM Fiscal genera el XML, valida contra XSD/catálogos vigentes, firma, envía al PAC, recibe el timbre y conserva XML/PDF.

El facturista puede revisar y rechazar el paquete, pero no modificar datos fiscales, conceptos, impuestos, importes, OC, posiciones, complemento o addenda. Si existe un error se corrige el pedido y se genera una nueva versión del snapshot.

## Información embebida

### Comprobante

Versión 4.0, serie sugerida, tipo de comprobante, moneda, tipo de cambio, forma y método de pago, exportación, lugar de expedición, subtotal, descuento, impuestos y total.

### Emisor

RFC, razón social y régimen fiscal. Se almacena como snapshot para evitar que una actualización posterior cambie un documento en proceso.

### Receptor

RFC, razón social exacta, código postal fiscal, régimen fiscal, Uso CFDI y, cuando aplique, residencia fiscal y registro tributario extranjero.

### Conceptos

Clave SAT, SKU, código del cliente, GTIN, número de identificación, cantidad, unidad SAT, descripción, valor unitario, importe, descuento, ObjetoImp, traslados, retenciones, información aduanera, cuenta predial y tercero a cuenta.

Cada concepto puede conservar su propia OC, posición de OC y código de artículo del cliente.

### Relaciones

Tipo de relación y un UUID por entrada. Nunca se concatenan varios UUID dentro de un solo atributo.

## Flujo de bloqueo

1. Pedido confirmado.
2. Validación comercial, inventario y crédito.
3. Validación fiscal previa.
4. Construcción del snapshot.
5. Cálculo de hash.
6. Bloqueo de la versión.
7. Envío idempotente a XOLUM Fiscal.
8. Rechazo técnico o aceptación/timbrado.
9. Cualquier corrección genera una nueva versión; jamás altera la anterior.

## Complementos

La preparación usa un registro versionado de esquemas con namespace, XSD, XSLT, vigencia y SHA-256. La activación se configura por operación y reglas fiscales; no se incrustan condiciones de clientes en código.

Soporte estructural inicial:

- Detallista 1.3.
- Comercio Exterior 2.0.
- Carta Porte 3.1.
- Otros complementos mediante adaptadores versionados.

El soporte estructural no significa que todos estén certificados para timbrado. Cada adaptador requiere ejemplos válidos, pruebas XSD, pruebas de cadena original y certificación con el PAC.

## Detallista 1.3

Se conserva de forma estructurada:

- Identificación de solicitud de pago.
- Estado y versiones del documento.
- Instrucciones especiales.
- Identificación de pedido.
- Nota de entrega.
- Comprador, vendedor y ShipTo.
- Moneda y condiciones de pago.
- Detalle de embarque.
- Cargos y descuentos.
- Partidas con GTIN, códigos alternos, cantidades, precios e importes.
- Totales.

La transformación a XML ocurre en XOLUM Fiscal y se valida contra el esquema oficial activo del SAT.

## Addendas

Las addendas no se mezclan con complementos. XOLUM Sales puede preparar su payload comercial, pero XOLUM Addendas es un producto independiente y cada addenda cuenta con versión, reglas, pruebas y precio propios.

## Fuentes oficiales

- CFDI 4.0: https://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd
- Detallista: https://www.sat.gob.mx/sitio_internet/cfd/detallista/detallista.xsd
- Transformación Detallista: https://www.sat.gob.mx/sitio_internet/cfd/detallista/detallista.xslt
