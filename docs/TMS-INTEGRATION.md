# Contrato propuesto Sales → TMS

Esta documentación no modifica ni supone capacidades terminadas en TMS.dev.

## Condiciones comerciales

TMS es un módulo contratable por separado. Sin conexión activa no se muestran tracking, ETA, POD ni validación automática de entrega.

## Envío

`POST /api/v1/shipments`

Headers:

- `Authorization: Bearer <credential>`
- `Idempotency-Key: <organization>:<sales-order>`
- `X-Correlation-ID: <uuid>`

Payload lógico:

```json
{
  "externalOrderId": "XS-1048",
  "customer": { "code": "C-001", "name": "Cliente" },
  "reference": "OC-450001",
  "promisedAt": "2026-08-25T18:00:00-06:00",
  "stop": {
    "externalAddressId": "CEDIS-01",
    "address": "Dirección estructurada",
    "latitude": 19.4326,
    "longitude": -99.1332,
    "windowStart": "2026-08-25T09:00:00-06:00",
    "windowEnd": "2026-08-25T13:00:00-06:00"
  },
  "totals": { "weightKg": 180.5, "volumeM3": 2.4 },
  "podPolicy": ["PHOTO", "SIGNATURE", "STAMP"]
}
```

## Eventos recibidos

- shipment.created
- shipment.loaded
- route.released
- route.started
- stop.arrived
- delivery.completed
- delivery.partial
- delivery.rejected
- evidence.created
- incident.created

## Seguridad y resiliencia

- Firma HMAC y comparación constante.
- Idempotencia obligatoria.
- Correlation ID de punta a punta.
- Delivery log y payload hash.
- Reintentos exponenciales con cola de fallos.
- Conciliación programada Sales vs TMS.
- Nunca acceso directo a la base del TMS.
- `delivery.completed` no cierra el pedido hasta validar la política de POD.
