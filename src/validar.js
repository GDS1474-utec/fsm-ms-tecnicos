const { ErrorHttp } = require('./errores');

const campos = ['nombre', 'apellido', 'correo', 'telefono', 'especialidad', 'zona', 'estado'];
const obligatorios = ['nombre', 'apellido', 'correo', 'especialidad'];
const estados = ['disponible', 'ocupado', 'inactivo', 'vacaciones'];

function texto(valor, minimo, maximo, campo) {
  if (typeof valor !== 'string' || valor.trim().length < minimo || valor.trim().length > maximo) {
    throw new ErrorHttp(400, `El campo ${campo} no es válido`);
  }
  return valor.trim();
}

function validarTecnico(datos, parcial = false) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new ErrorHttp(400, 'El cuerpo debe ser un objeto JSON');
  }

  const claves = Object.keys(datos);
  if (!claves.length) {
    throw new ErrorHttp(400, 'Debe enviar al menos un campo');
  }
  if (claves.some(campo => !campos.includes(campo))) {
    throw new ErrorHttp(400, 'Se enviaron campos no permitidos');
  }
  if (!parcial && obligatorios.some(campo => datos[campo] === undefined)) {
    throw new ErrorHttp(400, 'Faltan nombre, apellido, correo o especialidad');
  }

  const resultado = {};
  for (const campo of claves) {
    if (campo === 'nombre' || campo === 'apellido') {
      resultado[campo] = texto(datos[campo], 2, 80, campo);
    } else if (campo === 'correo') {
      const correo = texto(datos[campo], 5, 180, campo).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        throw new ErrorHttp(400, 'El correo no es válido');
      }
      resultado[campo] = correo;
    } else if (campo === 'telefono') {
      resultado[campo] = texto(datos[campo], 6, 20, campo);
      if (!/^[+0-9\s()-]+$/.test(resultado[campo])) {
        throw new ErrorHttp(400, 'El teléfono no es válido');
      }
    } else if (campo === 'especialidad') {
      resultado[campo] = texto(datos[campo], 2, 100, campo);
    } else if (campo === 'zona') {
      resultado[campo] = texto(datos[campo], 2, 100, campo);
    } else if (campo === 'estado') {
      if (!estados.includes(datos[campo])) {
        throw new ErrorHttp(400, 'El estado no es válido');
      }
      resultado[campo] = datos[campo];
    }
  }
  return resultado;
}

function validarId(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
    throw new ErrorHttp(400, 'ID de técnico no válido');
  }
  return id;
}

function leerPaginacion(params = {}, tenantId) {
  const cantidad = params.limite === undefined ? 25 : Number(params.limite);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100) {
    throw new ErrorHttp(400, 'El límite debe estar entre 1 y 100');
  }

  const filtros = {};
  if (params.estado !== undefined) {
    if (!estados.includes(params.estado)) {
      throw new ErrorHttp(400, 'El estado no es válido');
    }
    filtros.estado = params.estado;
  }
  if (params.especialidad !== undefined) {
    filtros.especialidad = texto(params.especialidad, 2, 100, 'especialidad');
  }

  let ultimo;
  if (params.siguiente !== undefined) {
    try {
      const contenido = Buffer.from(params.siguiente, 'base64url');
      if (contenido.toString('base64url') !== params.siguiente) {
        throw new Error();
      }
      ultimo = JSON.parse(contenido.toString('utf8'));
      if (!ultimo || ultimo.tenant_id !== tenantId ||
          typeof ultimo.tecnico_id !== 'string' ||
          !/^[A-Za-z0-9_-]{1,100}$/.test(ultimo.tecnico_id)) {
        throw new Error();
      }
      ultimo = { tenant_id: tenantId, tecnico_id: ultimo.tecnico_id };
    } catch {
      throw new ErrorHttp(400, 'El cursor de paginación no es válido');
    }
  }

  return { limite: cantidad, filtros, ultimo };
}

module.exports = { validarTecnico, validarId, leerPaginacion };
