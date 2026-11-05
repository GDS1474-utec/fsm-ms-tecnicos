const { createWriteStream, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { once } = require('node:events');
const { modulos, tenants } = require('./generador');

async function generar(directorio = join(__dirname, '..', 'data')) {
  mkdirSync(directorio, { recursive: true });
  for (const [nombre, crearRegistro] of Object.entries(modulos)) {
    const archivo = join(directorio, `${nombre}.jsonl`);
    const salida = createWriteStream(archivo, { encoding: 'utf8' });
    for (const tenant of tenants) {
      for (let i = 1; i <= 10000; i++) {
        if (!salida.write(`${JSON.stringify(crearRegistro(tenant, i))}\n`)) {
          await once(salida, 'drain');
        }
      }
    }
    salida.end();
    await once(salida, 'finish');
    console.log(`${nombre}: 30000 registros -> ${archivo}`);
  }
}

if (require.main === module) {
  generar().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { generar };
