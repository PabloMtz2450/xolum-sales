# Gobierno de validación SAT/PAC

## Objetivo

> Un error conocido y determinista del SAT o del PAC nunca debe descubrirse después de presionar “Timbrar”.

El PAC es la última certificación, no el detector primario de errores de XOLUM.

## Nueve capas obligatorias

1. Datos y formato.
2. Catálogos SAT y vigencia.
3. Anexo 20, dependencias y atributos prohibidos.
4. Cálculos, impuestos, redondeos y totales.
5. Relaciones CFDI.
6. Complementos con validador propio.
7. XSD base y complementarios.
8. CSD, sello y cadena original.
9. Preflight PAC sobre los bytes exactos del XML final.

No puede omitirse una capa. Los perfiles I, E, T y P ejecutan las nueve. Pagos 2.0 utiliza reglas y corpus independientes.

## Registro de reglas

Cada regla contiene:

`código → condición → vigencia → fuente → mensaje → prueba positiva → prueba negativa → versión`

No se aceptan reglas fiscales anónimas ni condiciones incrustadas sin referencia documental.

## Fuentes vigentes mínimas

- Anexo 20 y CFDI 4.0.
- Catálogos CFDI con vigencia.
- Matriz de errores CFDI 4.0.
- Matriz de errores Pagos 2.0.
- XSD y XSLT base/complementarios.
- Anexo 29 RMF 2026 publicado el 9 de enero de 2026.
- Primera Modificación al Anexo 29 publicada el 17 de julio de 2026.
- Documentación y sandbox del PAC contratado.

La [página oficial de normatividad 2026](https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/normatividad_rmf_rgce2026.html) confirma ambas publicaciones del Anexo 29.

## Versionado y actualización

1. Descargar fuente oficial.
2. Registrar URL, fecha de descarga y SHA-256.
3. Comparar con la versión vigente.
4. Identificar altas, bajas y cambios.
5. Actualizar reglas afectadas.
6. Ejecutar corpus completo.
7. Segunda revisión independiente.
8. Liberar versión firmada del ruleset.

Una actualización normativa bloquea el despliegue fiscal hasta terminar la regresión.

## Pagos 2.0

Debe validar de forma propia:

- Uno o varios pagos.
- Documentos relacionados.
- Número de parcialidad.
- Saldo anterior.
- Importe pagado.
- Saldo insoluto.
- Moneda del pago y documento.
- Tipo de cambio y EquivalenciaDR.
- Impuestos por documento.
- Impuestos por pago.
- Totales expresados en MXN.
- Redondeos y tolerancias oficiales.
- Atributos prohibidos en la cabecera.

## Rechazos reales

Flujo obligatorio:

`rechazo PAC → causa raíz → regla XOLUM → prueba positiva → prueba negativa → regresión completa → segunda revisión`

Si el código ya era conocido, el incidente se clasifica como defecto crítico. No se permite reintento silencioso.

Cuando el resultado del timbrado sea indeterminado, primero se consulta por hash, serie/folio o identificador del PAC. Nunca se genera automáticamente un segundo CFDI.

## Criterios para producción

- Cobertura matriz SAT: 100%.
- Cobertura matriz del complemento: 100%.
- Catálogos vigentes y reproducibles por fecha.
- Todos los XSD/XSLT verificados.
- Corpus positivo y negativo aprobado.
- CSD y cadena original aprobados.
- Sandbox PAC aprobado.
- Pruebas de timeout e idempotencia aprobadas.
- Segunda revisión completa aprobada.
- Evidencia de certificación conservada.

Mientras falte cualquiera, `productionStampingEnabled = false`.
