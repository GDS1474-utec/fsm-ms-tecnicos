const { randomUUID } = require('node:crypto');
const { ErrorHttp } = require('./errores');
const { validarTecnico, validarId, leerPaginacion } = require('./validar');

function crearServicio(repositorio) {
  return {
    async crear(tenantId, datos) {
      const tecnico = validarTecnico(datos);
      const ahora = new Date().toISOString();
      const registro = {
        tenant_id: tenantId,
        tecnico_id: `TEC-${randomUUID()}`,
        ...tecnico,
        estado: tecnico.estado || 'disponible',
        fecha_creacion: ahora,
        fecha_actualizacion: ahora
      };
      return repositorio.crear(registro);
    },

    async listar(tenantId, params) {
      const opciones = leerPaginacion(params, tenantId);
      const resultado = await repositorio.listar(tenantId, opciones);
      return {
        registros: resultado.registros,
        cantidad: resultado.registros.length,
        siguiente: resultado.siguiente
          ? Buffer.from(JSON.stringify(resultado.siguiente)).toString('base64url')
          : null
      };
    },

    async obtener(tenantId, id) {
      const tecnico = await repositorio.obtener(tenantId, validarId(id));
      if (!tecnico) {
        throw new ErrorHttp(404, 'Técnico no encontrado');
      }
      return tecnico;
    },

    async actualizar(tenantId, id, datos) {
      validarId(id);
      const cambios = validarTecnico(datos, true);
      cambios.fecha_actualizacion = new Date().toISOString();
      return repositorio.actualizar(tenantId, id, cambios);
    },

    async eliminar(tenantId, id) {
      validarId(id);
      return repositorio.eliminar(tenantId, id);
    }
  };
}

module.exports = { crearServicio };
