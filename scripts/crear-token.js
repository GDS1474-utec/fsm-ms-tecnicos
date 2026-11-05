const { crearToken } = require('../src/auth/jwt');

const tenant = process.argv[2] || 'tenant-1';
const rol = process.argv[3] || 'admin';
const usuario = process.argv[4] || 'usuario-demo';
const secreto = process.env.JWT_SECRET;

if (!/^tenant-[123]$/.test(tenant) || !['admin', 'despachador', 'tecnico'].includes(rol) || !secreto || secreto.length < 32) {
  console.error('Uso: JWT_SECRET=... node scripts/crear-token.js tenant-1 admin');
  process.exit(1);
}

const token = crearToken({ tenant_id: tenant, rol, sub: usuario }, secreto, {
  issuer: process.env.JWT_ISSUER || 'fsm-grupo5',
  audience: process.env.JWT_AUDIENCE || 'fsm-api'
});

console.log(token);
