const { crearToken } = require('../src/auth/jwt');

const base = (process.argv[2] || '').replace(/\/$/, '');
const secreto = process.env.JWT_SECRET;
const local = process.env.AUTH_MODE === 'local';

if (!/^https:\/\//.test(base)) {
  console.error('Uso: node scripts/probar-api.js https://api.execute-api.us-east-1.amazonaws.com/dev');
  process.exit(1);
}

function token(tenant) {
  if (!local) return process.env[`TOKEN_${tenant.replace('-', '_').toUpperCase()}`];
  if (!secreto || secreto.length < 32) throw new Error('Falta JWT_SECRET para AUTH_MODE=local');
  return crearToken({ sub: 'prueba-api', rol: 'admin', tenant_id: tenant }, secreto, {
    issuer: process.env.JWT_ISSUER || 'fsm-grupo5',
    audience: process.env.JWT_AUDIENCE || 'fsm-api'
  });
}

async function llamar(metodo, ruta, jwt, datos, esperado) {
  if (!jwt) throw new Error('Falta el token del tenant');
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: datos ? JSON.stringify(datos) : undefined
  });
  const texto = await respuesta.text();
  let contenido;
  try {
    contenido = JSON.parse(texto);
  } catch {
    contenido = { error: texto };
  }
  if (respuesta.status !== esperado) {
    throw new Error(`${metodo} ${ruta}: esperado ${esperado}, recibido ${respuesta.status}: ${texto}`);
  }
  return contenido;
}

async function probar() {
  const a = token('tenant-1');
  const b = token('tenant-2');
  const creado = await llamar('POST', '/tecnicos', a, {
    nombre: 'Mario', apellido: 'Silva', correo: `prueba${Date.now()}@example.com`,
    telefono: '987654321', especialidad: 'Electricidad', zona: 'Surco'
  }, 201);
  const id = creado.tecnico.tecnico_id;
  try {
    await llamar('GET', `/tecnicos/${id}`, a, undefined, 200);
    await llamar('GET', `/tecnicos/${id}`, b, undefined, 404);
    await llamar('PUT', `/tecnicos/${id}`, a, { estado: 'ocupado' }, 200);
    const actualizado = await llamar('GET', `/tecnicos/${id}`, a, undefined, 200);
    if (actualizado.tecnico.estado !== 'ocupado') throw new Error('La actualización no se guardó');
    await llamar('GET', '/tecnicos?limite=5', b, undefined, 200);
    console.log('Prueba de CRUD y separación de tenants: OK');
  } finally {
    await llamar('DELETE', `/tecnicos/${id}`, a, undefined, 200);
  }
}

probar().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
