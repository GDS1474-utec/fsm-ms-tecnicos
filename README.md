# FSM SaaS - Microservicio de Técnicos (MS-B)

Proyecto final de Cloud Computing CS2032, grupo 5. Gestión de técnicos para la plataforma FSM.

## Estructura

```text
fsm-ms-tecnicos/
├── src/
│   ├── auth/
│   ├── handlers.js
│   ├── repositorio.js
│   ├── servicio.js
│   └── validar.js
├── scripts/
├── tests/
├── docs/
├── postman/
├── data/
├── serverless.yml
└── package.json
```

**Servicios:** API Gateway, AWS Lambda, DynamoDB y Serverless Framework. Se usa `LabRole`, como en el repositorio MS-D de Visitas.

## Contrato con Visitas

- Tenants: `tenant-1`, `tenant-2` y `tenant-3`.
- Técnicos de prueba: `TEC-001`, `TEC-002`, ..., `TEC-040`, hasta `TEC-10000`.
- Base de datos: `fsm-<stage>-tecnicos`, con claves `tenant_id` y `tecnico_id`.
- Autenticación compartida: Lambda `fsm-<stage>-validar-token` del microservicio A.
- Roles: `admin` y `despachador` pueden crear, modificar o eliminar; cualquier usuario autenticado puede consultar.

El diagrama y el contrato propuesto están en `docs/`. Las confirmaciones pendientes con MS-A, MS-C y MS-E figuran en `docs/contratos-integracion.md`.

## Endpoints

Todos requieren `Authorization: Bearer <token>`.

| Método | Ruta | Acción |
|---|---|---|
| POST | `/tecnicos` | Registrar técnico |
| GET | `/tecnicos` | Listar técnicos del tenant |
| GET | `/tecnicos/{id}` | Obtener técnico |
| PUT | `/tecnicos/{id}` | Modificar técnico |
| DELETE | `/tecnicos/{id}` | Eliminar técnico |

`GET /tecnicos` permite los parámetros `limite` (1 a 100), `estado`, `especialidad` y `siguiente`. La respuesta incluye el cursor para pedir la siguiente página.

Ejemplo para registrar:

```json
{
  "nombre": "Luis",
  "apellido": "Rojas",
  "correo": "luis.rojas@example.com",
  "telefono": "987654321",
  "especialidad": "Electricidad",
  "zona": "Surco",
  "estado": "disponible"
}
```

El `tenant_id` sale del token validado, nunca del cuerpo de la petición. El `tecnico_id` se genera al crear un registro por API; los IDs `TEC-001` son los del dataset de prueba.

## Instalar y probar

Necesitas Node.js 20 o superior, AWS CLI con las credenciales vigentes y permisos del Learner Lab.

```bash
npm install
npm test
```

El proyecto usa Serverless Framework v3, como el microservicio de Visitas.

## Despliegue en AWS Academy

Por defecto se valida el token mediante la Lambda compartida de MS-A:

```bash
npx serverless deploy --stage dev
npx serverless info --stage dev
```

Se crea la tabla `fsm-dev-tecnicos` y cinco rutas en API Gateway. Para probarlas con `AUTH_MODE=shared`, MS-A debe haber desplegado la Lambda `fsm-dev-validar-token`, aceptar `{"token":"..."}` y devolver `{"statusCode":200,"body":{"tenant_id":"tenant-1","rol":"admin"}}`. La respuesta `body` también puede venir como texto JSON. El rol de ejecución `LabRole` debe poder llamar a esa Lambda.

### Pruebas temporales mientras MS-A no esté listo

Solo para el entorno `dev` se puede desplegar con verificación local de JWT:

```bash
export AUTH_MODE=local
export JWT_SECRET="$(openssl rand -hex 32)"
npx serverless deploy --stage dev
export TOKEN="$(node scripts/crear-token.js tenant-1 admin)"
npx serverless info --stage dev
```

Usa la URL mostrada por `serverless info` para el ejemplo:

```bash
export API_URL="https://TU_API.execute-api.us-east-1.amazonaws.com/dev"
curl -X GET "$API_URL/tecnicos?limite=5" -H "Authorization: Bearer $TOKEN"
```

Para la integración definitiva, volver a desplegar en modo compartido:

```bash
unset AUTH_MODE JWT_SECRET
npx serverless deploy --stage dev
```

El modo local es solo de desarrollo. No se permite en otros stages. No subas tokens, `JWT_SECRET` ni archivos de credenciales al repositorio.

## Generar y cargar datos

Los datos no vienen dentro del repositorio porque se pueden reconstruir:

```bash
npm run datos
npm run verificar
```

Se generan cinco archivos JSONL en `data/`, cada uno con 30,000 registros (10,000 por tenant). La carga que corresponde a este microservicio es:

```bash
export TABLA_TECNICOS=fsm-dev-tecnicos
npm run cargar
```

La tabla debe existir y las credenciales AWS deben permitir `dynamodb:BatchWriteItem`. Se usan lotes de hasta 25 registros con reintentos.

Para los otros módulos, los archivos JSONL son propuestas de datos. Cada integrante debe confirmar si el esquema de su tabla coincide antes de importar. En particular, MS-D tiene su propio script `poblar_visitas.py`, que debe considerarse la referencia para su tabla.

## Demo con dos tenants

Con tokens emitidos por MS-A, configura las variables del entorno:

```bash
export TOKEN_TENANT_1="TOKEN_DEL_TENANT_1"
export TOKEN_TENANT_2="TOKEN_DEL_TENANT_2"
node scripts/probar-api.js "$API_URL"
```

Si desplegaste con `AUTH_MODE=local`, usa:

```bash
export AUTH_MODE=local
node scripts/probar-api.js "$API_URL"
```

La prueba crea un técnico en `tenant-1`, comprueba que `tenant-2` no puede leerlo, lo modifica y lo elimina. También puedes importar `postman/FSM_Tecnicos.postman_collection.json` en Postman y configurar `baseUrl` y `token`.

## Subir a GitHub

Crea un repositorio público vacío llamado `fsm-ms-tecnicos` y ejecuta desde esta carpeta:

```bash
git init
git add .
git commit -m "Microservicio de tecnicos FSM"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/fsm-ms-tecnicos.git
git push -u origin main
```

También puedes subir el contenido de esta carpeta con **Add file > Upload files** en GitHub. No subas `node_modules`, `.serverless`, `.env` ni los archivos `.jsonl` generados.

## Entregables

La estructura de DynamoDB está documentada en `docs/modelo-tecnicos.json`. Para el informe, guardar capturas de API Gateway, funciones Lambda, tabla DynamoDB, la carga de datos, ejecución de las pruebas y la demo multi-tenant. El repositorio de MS-B no despliega los recursos de los demás microservicios.
