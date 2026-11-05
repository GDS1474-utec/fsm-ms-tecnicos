const { createHmac, timingSafeEqual } = require('node:crypto');

function codificar(valor) {
  return Buffer.from(JSON.stringify(valor)).toString('base64url');
}

function decodificar(texto) {
  if (typeof texto !== 'string' || !/^[A-Za-z0-9_-]+$/.test(texto)) {
    throw new Error('Token inválido');
  }

  const datos = Buffer.from(texto, 'base64url');
  if (datos.toString('base64url') !== texto) {
    throw new Error('Token inválido');
  }

  return JSON.parse(datos.toString('utf8'));
}

function firma(mensaje, secreto) {
  return createHmac('sha256', secreto).update(mensaje).digest();
}

function crearToken(datos, secreto, opciones = {}) {
  if (typeof secreto !== 'string' || secreto.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  }

  const ahora = Math.floor(Date.now() / 1000);
  const duracion = opciones.duracion ?? 7200;
  const cabecera = { alg: 'HS256', typ: 'JWT' };
  const contenido = {
    sub: datos.sub,
    tenant_id: datos.tenant_id,
    rol: datos.rol || 'tecnico',
    iss: opciones.issuer || 'fsm-grupo5',
    aud: opciones.audience || 'fsm-api',
    iat: ahora,
    exp: ahora + duracion
  };

  const mensaje = `${codificar(cabecera)}.${codificar(contenido)}`;
  return `${mensaje}.${firma(mensaje, secreto).toString('base64url')}`;
}

function verificarToken(token, secreto, opciones = {}) {
  if (typeof secreto !== 'string' || secreto.length < 32) {
    throw new Error('Configuración de autenticación inválida');
  }

  const partes = typeof token === 'string' ? token.split('.') : [];
  if (partes.length !== 3) {
    throw new Error('Token inválido');
  }

  const cabecera = decodificar(partes[0]);
  const contenido = decodificar(partes[1]);
  if (!cabecera || typeof cabecera !== 'object' || cabecera.alg !== 'HS256' || cabecera.typ !== 'JWT' ||
      !contenido || typeof contenido !== 'object' || Array.isArray(contenido)) {
    throw new Error('Token inválido');
  }

  if (!/^[A-Za-z0-9_-]+$/.test(partes[2])) {
    throw new Error('Firma inválida');
  }

  const recibida = Buffer.from(partes[2], 'base64url');
  const esperada = firma(`${partes[0]}.${partes[1]}`, secreto);
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) {
    throw new Error('Firma inválida');
  }

  const ahora = Math.floor(Date.now() / 1000);
  const issuer = opciones.issuer || 'fsm-grupo5';
  const audience = opciones.audience || 'fsm-api';
  const audienciaValida = typeof contenido.aud === 'string'
    ? contenido.aud === audience
    : Array.isArray(contenido.aud) && contenido.aud.includes(audience);

  if (!contenido || contenido.iss !== issuer || !audienciaValida ||
      !Number.isInteger(contenido.exp) || ahora >= contenido.exp ||
      (contenido.nbf !== undefined && (!Number.isInteger(contenido.nbf) || ahora < contenido.nbf)) ||
      (contenido.iat !== undefined && (!Number.isInteger(contenido.iat) || contenido.iat > ahora + 60)) ||
      typeof contenido.sub !== 'string' || !contenido.sub ||
      typeof contenido.tenant_id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(contenido.tenant_id)) {
    throw new Error('Token inválido o vencido');
  }

  return contenido;
}

module.exports = { crearToken, verificarToken };
