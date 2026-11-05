const nombres = ['Luis', 'Andrea', 'Marco', 'Valeria', 'Carlos', 'Camila', 'Jorge', 'Daniela', 'Sergio', 'Lucía', 'Bruno', 'Mariana'];
const apellidos = ['Rojas', 'Flores', 'Paredes', 'Vargas', 'Medina', 'Torres', 'Castillo', 'Salazar', 'Mendoza', 'Soto', 'Herrera', 'Ramírez'];
const zonas = ['Lima Centro', 'Miraflores', 'San Isidro', 'Surco', 'La Molina', 'San Miguel', 'Callao', 'Los Olivos'];
const especialidades = ['Electricidad', 'Climatización', 'Redes', 'Refrigeración', 'Plomería', 'Mantenimiento'];
const estados = ['disponible', 'ocupado', 'disponible', 'disponible', 'vacaciones', 'inactivo'];
const servicios = ['Mantenimiento preventivo', 'Instalación de equipo', 'Reparación correctiva', 'Inspección técnica', 'Diagnóstico de avería'];
const prioridades = ['baja', 'media', 'alta'];
const tenants = ['tenant-1', 'tenant-2', 'tenant-3'];

function codigo(prefijo, numero, ancho) {
  return `${prefijo}-${String(numero).padStart(ancho, '0')}`;
}

function fecha(numero, horas = 0) {
  const base = Date.UTC(2026, 9, 1, 8, 0);
  return new Date(base + (numero % 55) * 86400000 + horas * 3600000).toISOString().replace('.000Z', 'Z');
}

function generarTecnico(tenant, i) {
  const nombre = nombres[(i * 7 + tenants.indexOf(tenant)) % nombres.length];
  const apellido = apellidos[(i * 5 + tenants.indexOf(tenant)) % apellidos.length];
  return {
    tenant_id: tenant,
    tecnico_id: codigo('TEC', i, 3),
    nombre,
    apellido,
    correo: `tecnico${i}@${tenant}.example.com`,
    telefono: `9${String(10000000 + ((i * 7919) % 90000000)).padStart(8, '0')}`,
    especialidad: especialidades[i % especialidades.length],
    zona: zonas[i % zonas.length],
    estado: estados[i % estados.length],
    fecha_creacion: fecha(i),
    fecha_actualizacion: fecha(i)
  };
}

function generarClienteSitio(tenant, i) {
  if (i <= 5000) {
    return {
      tenant_id: tenant,
      registro_id: codigo('CLI', i, 4),
      tipo: 'cliente',
      nombre: `Cliente ${i} ${tenant}`,
      correo: `cliente${i}@${tenant}.example.com`,
      telefono: `01${String(1000000 + i).padStart(7, '0')}`,
      creado_en: fecha(i)
    };
  }
  const sitio = i - 5000;
  const cliente = Math.ceil(sitio / 2);
  return {
    tenant_id: tenant,
    registro_id: codigo('SIT', sitio, 4),
    tipo: 'sitio',
    cliente_id: codigo('CLI', cliente, 4),
    nombre: `Local ${sitio}`,
    direccion: `Av. Principal ${100 + sitio}, ${zonas[sitio % zonas.length]}`,
    zona: zonas[sitio % zonas.length],
    creado_en: fecha(i)
  };
}

function referencias(i) {
  const sitio = ((i - 1) % 600) + 1;
  const cliente = Math.ceil(sitio / 2);
  const tecnico = ((i - 1) % 40) + 1;
  return {
    orden_id: codigo('ORD', i, 6),
    cliente_id: codigo('CLI', cliente, 4),
    sitio_id: codigo('SIT', sitio, 4),
    tecnico_id: codigo('TEC', tecnico, 3)
  };
}

function generarOrden(tenant, i) {
  const refs = referencias(i);
  return {
    tenant_id: tenant,
    ...refs,
    descripcion: servicios[i % servicios.length],
    prioridad: prioridades[i % prioridades.length],
    estado: ['pendiente', 'asignada', 'en_proceso', 'finalizada'][i % 4],
    creado_en: fecha(i),
    actualizado_en: fecha(i)
  };
}

function generarVisita(tenant, i) {
  const refs = referencias(i);
  const estado = ['pendiente', 'programada', 'en_curso', 'completada', 'cancelada'][i % 5];
  const inicio = fecha(i + 2, 1);
  const fin = fecha(i + 2, 3);
  const registro = {
    tenant_id: tenant,
    visita_id: codigo('VIS', i, 6),
    orden_id: refs.orden_id,
    cliente_id: refs.cliente_id,
    sitio_id: refs.sitio_id,
    estado,
    prioridad: prioridades[i % prioridades.length],
    notas: servicios[i % servicios.length],
    evidencias: [],
    creado_en: fecha(i),
    actualizado_en: fecha(i + 2)
  };
  if (estado !== 'pendiente') {
    registro.tecnico_id = refs.tecnico_id;
    registro.tecnico_clave = `${tenant}#${refs.tecnico_id}`;
    registro.fecha_inicio = inicio;
    registro.fecha_fin = fin;
  }
  if (estado === 'completada') {
    registro.completada_en = fin;
    registro.observaciones = 'Trabajo realizado';
    registro.repuestos_usados = [{ repuesto_id: codigo('REP', (i % 500) + 1, 4), cantidad: 1 }];
  }
  if (estado === 'cancelada') registro.motivo_cancelacion = 'Reprogramación del cliente';
  return registro;
}

function generarRepuestoFactura(tenant, i) {
  if (i <= 5000) {
    return {
      tenant_id: tenant,
      registro_id: codigo('REP', i, 4),
      tipo: 'repuesto',
      nombre: `Repuesto ${i}`,
      categoria: ['eléctrico', 'mecánico', 'hidráulico', 'electrónico'][i % 4],
      precio_unitario: 20 + (i % 60) * 4,
      stock: i % 80,
      actualizado_en: fecha(i)
    };
  }
  const num = i - 5000;
  const subtotal = 100 + (num % 50) * 12;
  return {
    tenant_id: tenant,
    registro_id: codigo('FAC', num, 6),
    tipo: 'factura',
    orden_id: codigo('ORD', num, 6),
    repuesto_id: codigo('REP', num, 4),
    subtotal,
    igv: Math.round(subtotal * 0.18 * 100) / 100,
    total: Math.round(subtotal * 1.18 * 100) / 100,
    estado: ['emitida', 'pagada', 'pendiente'][num % 3],
    fecha_emision: fecha(num)
  };
}

const modulos = {
  'clientes-sitios': generarClienteSitio,
  tecnicos: generarTecnico,
  ordenes: generarOrden,
  visitas: generarVisita,
  'repuestos-facturacion': generarRepuestoFactura
};

module.exports = { modulos, tenants, codigo, referencias, generarTecnico };
