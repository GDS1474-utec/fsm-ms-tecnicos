const test = require('node:test');
const assert = require('node:assert/strict');
const { crearToken, verificarToken } = require('../src/auth/jwt');
const { validarAcceso, exigirRol } = require('../src/auth/validar-token');

const secreto = 'secreto-local-para-pruebas-del-proyecto-fsm-2026';
const tokenA = crearToken({ sub: 'usuario1', tenant_id: 'tenant-1', rol: 'admin' }, secreto, {
  issuer: 'fsm-grupo5', audience: 'fsm-api'
});

test('verifica el token y el tenant', () => {
  const datos = verificarToken(tokenA, secreto);
  assert.equal(datos.tenant_id, 'tenant-1');
  assert.equal(datos.rol, 'admin');
});

test('rechaza un token alterado o vencido', () => {
  assert.throws(() => verificarToken(`${tokenA.slice(0, -3)}abc`, secreto));
  const vencido = crearToken({ sub: 'usuario1', tenant_id: 'tenant-1' }, secreto, { duracion: -1 });
  assert.throws(() => verificarToken(vencido, secreto));
});

test('el modo compartido lee el contrato de la Lambda de A', async () => {
  const usuario = await validarAcceso({ headers: { Authorization: 'Bearer valido' } }, {
    modo: 'shared', invocar: async token => {
      assert.equal(token, 'valido');
      return { statusCode: 200, body: JSON.stringify({ tenant_id: 'tenant-2', rol: 'despachador' }) };
    }
  });
  assert.equal(usuario.tenant_id, 'tenant-2');
  assert.equal(usuario.rol, 'despachador');
});

test('rechaza token ausente, validador fallido y tenant inválido', async () => {
  await assert.rejects(() => validarAcceso({ headers: {} }, { modo: 'shared' }), { codigo: 403 });
  await assert.rejects(() => validarAcceso({ headers: { authorization: 'Bearer otro' } }, {
    modo: 'shared', invocar: async () => ({ statusCode: 403 })
  }), { codigo: 403 });
  await assert.rejects(() => validarAcceso({ headers: { authorization: 'Bearer otro' } }, {
    modo: 'shared', invocar: async () => ({ statusCode: 200, body: { tenant_id: '' } })
  }), { codigo: 403 });
});

test('la validación local exige firma y solo se permite en dev', async () => {
  process.env.STAGE = 'dev';
  process.env.JWT_SECRET = secreto;
  process.env.JWT_ISSUER = 'fsm-grupo5';
  process.env.JWT_AUDIENCE = 'fsm-api';
  const usuario = await validarAcceso({ headers: { authorization: `Bearer ${tokenA}` } }, { modo: 'local' });
  assert.equal(usuario.tenant_id, 'tenant-1');
  await assert.rejects(() => validarAcceso({ headers: { authorization: 'Bearer falso' } }, { modo: 'local' }), { codigo: 403 });
  process.env.STAGE = 'prod';
  await assert.rejects(() => validarAcceso({ headers: { authorization: `Bearer ${tokenA}` } }, { modo: 'local' }), { codigo: 403 });
  process.env.STAGE = 'dev';
});

test('solo admin y despachador pueden modificar técnicos', () => {
  assert.doesNotThrow(() => exigirRol({ rol: 'admin' }));
  assert.doesNotThrow(() => exigirRol({ rol: 'despachador' }));
  assert.throws(() => exigirRol({ rol: 'tecnico' }), { codigo: 403 });
});
