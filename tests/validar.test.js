const test = require('node:test');
const assert = require('node:assert/strict');
const { validarTecnico, leerPaginacion } = require('../src/validar');

const datos = {
  nombre: 'Luis',
  apellido: 'Gómez',
  correo: 'Luis@ejemplo.com',
  especialidad: 'Redes'
};

test('valida técnico nuevo', () => {
  const tecnico = validarTecnico(datos);
  assert.equal(tecnico.correo, 'luis@ejemplo.com');
  assert.equal(tecnico.especialidad, 'Redes');
});

test('bloquea tenant_id e IDs en la entrada', () => {
  assert.throws(() => validarTecnico({ ...datos, tenant_id: 'tenant-2' }));
  assert.throws(() => validarTecnico({ ...datos, tecnico_id: 'TEC-123' }));
});

test('valida cambios parciales y rechaza estados incorrectos', () => {
  assert.deepEqual(validarTecnico({ estado: 'ocupado' }, true), { estado: 'ocupado' });
  assert.throws(() => validarTecnico({ estado: 'otro' }, true));
  assert.throws(() => validarTecnico({ correo: 'incorrecto' }, true));
});

test('no permite reutilizar el cursor de otro tenant', () => {
  const cursor = Buffer.from(JSON.stringify({ tenant_id: 'tenant-1', tecnico_id: 'TEC-1' })).toString('base64url');
  assert.deepEqual(leerPaginacion({ siguiente: cursor }, 'tenant-1').ultimo, {
    tenant_id: 'tenant-1', tecnico_id: 'TEC-1'
  });
  assert.throws(() => leerPaginacion({ siguiente: cursor }, 'tenant-2'));
});
