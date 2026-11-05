# Contratos de integración

## MS-D - Visitas

Los registros ficticios de Técnicos utilizan `tenant-1`, `tenant-2`, `tenant-3` y las claves `TEC-001`, `TEC-002`, etc. La tabla se llama `fsm-<stage>-tecnicos` y se consulta por `tenant_id` y `tecnico_id`.

El microservicio de Visitas guarda el campo `tecnico_id` como referencia, sin una relación física entre tablas. La verificación de existencia del técnico en la agenda todavía debe acordarse con el responsable de MS-D.

## MS-A - Autenticación

Se espera una función `fsm-<stage>-validar-token` invocable por AWS Lambda. Recibe `{"token":"..."}` y devuelve `{"statusCode":200,"body":{"tenant_id":"tenant-1","rol":"admin"}}`, con `body` también admitido como string JSON. La Lambda de Técnicos valida el resultado antes de consultar DynamoDB.

Los roles para modificar técnicos son `admin` y `despachador`. Para consultar se acepta cualquier rol autenticado. El contrato todavía debe ser confirmado con MS-A.

## MS-C - Órdenes

Los ejemplos de órdenes usan `ORD-000001`, `CLI-0001`, `SIT-0001` y `TEC-001`. El microservicio de Técnicos no crea ni publica órdenes. El esquema de Órdenes es provisional hasta recibir el contrato real de MS-C.

## MS-E - Repuestos y facturación

Los datos de ejemplo usan `REP-0001` y `FAC-000001`. El esquema de Repuestos y Facturación es provisional hasta recibir el contrato de MS-E.

## Datos compartidos

El generador crea 30,000 registros por módulo, 10,000 por tenant. Son archivos JSONL de apoyo, no cargas desplegadas. Visitas tiene su propio script; para poblar la tabla de Visitas se debe preferir el script aprobado por el responsable de MS-D.
