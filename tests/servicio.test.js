const test = require('node:test');
const assert = require('node:assert/strict');
const { crearServicio } = require('../src/servicio');
const { modulos, tenants } = require('../scripts/generador');

function repositorioMemoria() {
  const items = new Map();
  const clave = (t, id) => `${t}::${id}`;
  return {
    async crear(item) {
      items.set(clave(item.tenant_id, item.tecnico_id), item);
      return item;
    },
    async obtener(t, id) {
      return items.get(clave(t, id)) || null;
    },
    async listar(t, opciones) {
      const registros = [...items.values()].filter(x => x.tenant_id === t).slice(0, opciones.limite);
      return { registros, siguiente: null };
    },
    async actualizar(t, id, cambios) {
      const previo = items.get(clave(t, id));
      if (!previo) throw new Error('No existe');
      const nuevo = { ...previo, ...cambios };
      items.set(clave(t, id), nuevo);
      return nuevo;
    },
    async eliminar(t, id) {
      const previo = items.get(clave(t, id));
      items.delete(clave(t, id));
      return previo;
    }
  };
}

test('el CRUD mantiene los datos separados por tenant', async () => {
  const servicio = crearServicio(repositorioMemoria());
  const creado = await servicio.crear('tenant-1', {
    nombre: 'Jorge', apellido: 'Rojas', correo: 'jorge@example.com', especialidad: 'Redes'
  });
  assert.equal((await servicio.obtener('tenant-1', creado.tecnico_id)).nombre, 'Jorge');
  await assert.rejects(() => servicio.obtener('tenant-2', creado.tecnico_id), { codigo: 404 });
  assert.equal((await servicio.listar('tenant-2', {})).cantidad, 0);
  const editado = await servicio.actualizar('tenant-1', creado.tecnico_id, { estado: 'ocupado' });
  assert.equal(editado.estado, 'ocupado');
  await servicio.eliminar('tenant-1', creado.tecnico_id);
  await assert.rejects(() => servicio.obtener('tenant-1', creado.tecnico_id), { codigo: 404 });
});

test('los cinco módulos comparten los tres tenants', () => {
  assert.equal(Object.keys(modulos).length, 5);
  for (const [nombre, generar] of Object.entries(modulos)) {
    for (const tenant of tenants) {
      const registro = generar(tenant, 1);
      assert.equal(registro.tenant_id, tenant, nombre);
    }
  }
});
