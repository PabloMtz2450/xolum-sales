# Estrategia de validación fiscal

## Estado real

La validación preventiva existe, pero el timbrado NO se considera certificado hasta importar y probar el 100% de las matrices oficiales vigentes y la matriz del PAC contratado.

## Capas obligatorias

1. **Estructura:** XML bien formado, namespaces, cardinalidad y orden.
2. **XSD:** CFDI 4.0 y XSD de cada complemento.
3. **Catálogos:** valor, vigencia y relación con la fecha de emisión.
4. **Matriz CFDI 4.0:** reglas aplicables a I, E, T, N y P.
5. **Matriz de complemento:** REP 2.0, Detallista, Comercio Exterior, Carta Porte u otro.
6. **Negocio:** pedido, OC por línea, precios, impuestos y autorización.
7. **Criptografía:** CSD vigente, RFC, llave, sello y cadena original.
8. **PAC:** reglas técnicas y códigos propios del proveedor.
9. **Post-timbrado:** UUID, timbre, sello SAT, XML devuelto y consulta de estado.

## Clasificación de errores

- **Corregible en Sales:** cliente, producto, OC, cantidad, precio, impuestos, UsoCFDI y configuración comercial.
- **Corregible en Fiscal:** XML, namespace, XSD, cadena original, CSD, PAC, serie y folio.
- **Externo:** estado SAT, listas, disponibilidad PAC o rechazo temporal.
- **No reintentable:** regla fiscal o dato inválido.
- **Reintentable:** timeout, HTTP 5xx o indisponibilidad confirmada.
- **Indeterminado:** si no se sabe si el PAC timbró, consultar antes de reintentar para impedir doble CFDI.

## Tipos

- **I – Ingreso:** venta/ingreso y complementos que correspondan.
- **E – Egreso:** devolución, descuento o bonificación, con relación correcta cuando aplique.
- **T – Traslado:** movimiento sin ingreso; reglas de importes y Carta Porte cuando aplique.
- **P – Pago:** CFDI con configuración fija y complemento Pagos 2.0.
- **N – Nómina:** se reconoce en el núcleo CFDI, pero queda fuera del alcance comercial de XOLUM Sales.

## Regla de producción

`canEnableProductionStamping` permanece en falso salvo que:

- XSD vigente aprobado.
- Catálogos validados por fecha.
- Cobertura de matriz SAT = 100%.
- Cobertura de matriz del complemento = 100%.
- Suite del PAC aprobada.
- Firma/CSD aprobados.
- Casos positivos y negativos aprobados.
- Segunda revisión independiente aprobada.

## Pruebas mínimas

Por cada regla oficial:

- Un XML válido que debe aceptarse.
- Un XML inválido que debe producir el código esperado.
- Prueba de límite, decimales y redondeo cuando aplique.
- Prueba de vigencia de catálogo.
- Evidencia de resultado.
- Identificador de versión de matriz y PAC.

## Fuentes maestras

- Matriz CFDI 4.0: https://www.sat.gob.mx/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1461175250493&ssbinary=true
- Matriz REP 2.0: https://www.sat.gob.mx/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1461175071013&ssbinary=true
- XSD CFDI 4.0: https://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd

Los documentos descargados deben almacenarse con fecha, SHA-256 y control de cambios. Una actualización del SAT bloquea el despliegue hasta repetir la comparación y regresión.
