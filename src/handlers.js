const { crearRepositorio } = require('./repositorio');
const { crearServicio } = require('./servicio');
const { ErrorHttp } = require('./errores');
const { validarAcceso, exigirRol } = require('./auth/validar-token');

let instancia;

function servicio() {
  if (!instancia) instancia = crearServicio(crearRepositorio());
  return instancia;
}

function respuesta(codigo, datos) {
  return {
    statusCode: codigo,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify(datos)
  };
}

function cuerpo(evento) {
  if (!evento.body) throw new ErrorHttp(400, 'Debe enviar un cuerpo JSON');
  try {
    const contenido = evento.isBase64Encoded
      ? Buffer.from(evento.body, 'base64').toString('utf8')
      : evento.body;
    return typeof contenido === 'string' ? JSON.parse(contenido) : contenido;
  } catch {
    throw new ErrorHttp(400, 'El cuerpo no contiene un JSON válido');
  }
}

function parametro(evento, campo) {
  return evento.pathParameters?.[campo] || evento.path?.[campo];
}

function consulta(evento) {
  return evento.queryStringParameters || evento.query || {};
}

function ejecutar(accion, modificar = false) {
  return async evento => {
    try {
      const usuario = await validarAcceso(evento);
      if (modificar) exigirRol(usuario);
      const { codigo, datos } = await accion(evento, usuario.tenant_id);
      return respuesta(codigo, datos);
    } catch (error) {
      if (error instanceof ErrorHttp) return respuesta(error.codigo, { error: error.message });
      if (error.name === 'ConditionalCheckFailedException') {
        return respuesta(404, { error: 'Técnico no encontrado' });
      }
      console.error(error);
      return respuesta(500, { error: 'No se pudo completar la operación' });
    }
  };
}

const crear = ejecutar(async (evento, tenantId) => ({
  codigo: 201,
  datos: { mensaje: 'Técnico registrado', tecnico: await servicio().crear(tenantId, cuerpo(evento)) }
}), true);

const listar = ejecutar(async (evento, tenantId) => ({
  codigo: 200,
  datos: await servicio().listar(tenantId, consulta(evento))
}));

const obtener = ejecutar(async (evento, tenantId) => ({
  codigo: 200,
  datos: { tecnico: await servicio().obtener(tenantId, parametro(evento, 'id')) }
}));

const actualizar = ejecutar(async (evento, tenantId) => ({
  codigo: 200,
  datos: { mensaje: 'Técnico actualizado', tecnico: await servicio().actualizar(tenantId, parametro(evento, 'id'), cuerpo(evento)) }
}), true);

const eliminar = ejecutar(async (evento, tenantId) => {
  await servicio().eliminar(tenantId, parametro(evento, 'id'));
  return { codigo: 200, datos: { mensaje: 'Técnico eliminado' } };
}, true);

module.exports = { crear, listar, obtener, actualizar, eliminar };
