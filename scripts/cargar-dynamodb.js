const { resolve } = require('node:path');
const { cargar } = require('./importador');

const archivo = process.argv[2];
const tabla = process.argv[3];

if (!archivo || !tabla) {
  console.error('Uso: node scripts/cargar-dynamodb.js data/ordenes.jsonl nombre-tabla');
  process.exit(1);
}

cargar(resolve(archivo), tabla).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
