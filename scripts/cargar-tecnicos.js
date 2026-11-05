const { join } = require('node:path');
const { cargar } = require('./importador');

const tabla = process.env.TABLA_TECNICOS || process.env.TABLE_NAME;
const archivo = process.argv[2] || join(__dirname, '..', 'data', 'tecnicos.jsonl');

cargar(archivo, tabla).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
