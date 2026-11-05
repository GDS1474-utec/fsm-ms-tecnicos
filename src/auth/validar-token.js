const { ErrorHttp } = require('../errores');
const { verificarToken } = require('./jwt');

function extraerToken(evento) {
  const headers = evento.headers || {};
  const entrada = Object.entries(headers).find(([clave]) => clave.toLowerCase() === 'authorization');
  const valor = entrada ? entrada[1] : '';
  const coincidencia = /^Bearer\s+([^\s]+)$/i.exec(typeof valor === 'string' ? valor.trim() : '');
  if (!coincidencia) throw new ErrorHttp(403, 'Falta el token de acceso');
  return coincidencia[1];
}

async function validarAcceso(evento, opciones = {}) {
  const token = extraerToken(evento);
  const modo = opciones.modo || process.env.AUTH_MODE || 'shared';
  let usuario;

  if (modo === 'local') {
    if ((process.env.STAGE || 'dev') !== 'dev') {
      throw new ErrorHttp(403, 'La validación local solo se permite en dev');
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new ErrorHttp(503, 'Falta configurar JWT_SECRET para pruebas');
    }
    try {
      usuario = verificarToken(token, process.env.JWT_SECRET, {
        issuer: process.env.JWT_ISSUER || 'fsm-grupo5',
        audience: process.env.JWT_AUDIENCE || 'fsm-api'
      });
    } catch {
      throw new ErrorHttp(403, 'Token inválido o vencido');
    }
  } else if (modo === 'shared') {
    const invocar = opciones.invocar || invocarValidador;
    let resultado;
    try {
      resultado = await invocar(token);
    } catch (error) {
      console.error('No se pudo invocar el validador compartido', error);
      throw new ErrorHttp(503, 'Validador de acceso no disponible');
    }
    if (resultado?.statusCode !== 200) {
      throw new ErrorHttp(403, 'Token inválido o vencido');
    }
    try {
      usuario = typeof resultado.body === 'string' ? JSON.parse(resultado.body) : resultado.body;
    } catch {
      throw new ErrorHttp(503, 'Respuesta inválida del validador');
    }
  } else {
    throw new ErrorHttp(503, 'Modo de autenticación no configurado');
  }

  if (!usuario || typeof usuario.tenant_id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(usuario.tenant_id)) {
    throw new ErrorHttp(403, 'El token no contiene un tenant válido');
  }
  return usuario;
}

async function invocarValidador(token) {
  const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
  const nombre = process.env.VALIDADOR_TOKEN;
  if (!nombre) throw new Error('Falta VALIDADOR_TOKEN');
  const cliente = new LambdaClient({});
  const respuesta = await cliente.send(new InvokeCommand({
    FunctionName: nombre,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ token }))
  }));
  if (respuesta.FunctionError) throw new Error('El validador devolvió un error');
  return JSON.parse(Buffer.from(respuesta.Payload).toString('utf8'));
}

function exigirRol(usuario) {
  if (!['admin', 'despachador'].includes(usuario.rol)) {
    throw new ErrorHttp(403, 'El rol no permite modificar técnicos');
  }
}

module.exports = { extraerToken, validarAcceso, exigirRol };
