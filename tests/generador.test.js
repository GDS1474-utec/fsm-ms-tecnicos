const test = require('node:test');
const assert = require('node:assert/strict');
const { modulos, tenants, generarTecnico } = require('../scripts/generador');

test('usa los tenants y las claves de Visitas', () => {
  assert.deepEqual(tenants, ['tenant-1', 'tenant-2', 'tenant-3']);
  assert.equal(generarTecnico('tenant-1', 1).tecnico_id, 'TEC-001');
  assert.equal(generarTecnico('tenant-1', 40).tecnico_id, 'TEC-040');
  assert.equal(generarTecnico('tenant-2', 10000).tecnico_id, 'TEC-10000');
  const visita = modulos.visitas('tenant-1', 1);
  assert.equal(visita.visita_id, 'VIS-000001');
  assert.equal(visita.orden_id, 'ORD-000001');
  assert.equal(visita.tecnico_id, 'TEC-001');
  assert.equal(visita.tecnico_clave, 'tenant-1#TEC-001');
  assert.ok(visita.fecha_inicio < visita.fecha_fin);
  assert.equal(modulos['clientes-sitios']('tenant-1', 5001).cliente_id, 'CLI-0001');
});

test('ningún generador mezcla tenants', () => {
  for (const [nombre, generador] of Object.entries(modulos)) {
    for (const tenant of tenants) {
      const registro = generador(tenant, 1);
      assert.equal(registro.tenant_id, tenant, nombre);
    }
  }
});
