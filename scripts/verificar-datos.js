const { join } = require('node:path');
const { createReadStream } = require('node:fs');
const { createInterface } = require('node:readline');
const { modulos, tenants } = require('./generador');

async function verificar() {
  let total = 0;
  for (const nombre of Object.keys(modulos)) {
    const cantidades = Object.fromEntries(tenants.map(t => [t, 0]));
    const archivo = join(__dirname, '..', 'data', `${nombre}.jsonl`);
    const entrada = createInterface({ input: createReadStream(archivo), crlfDelay: Infinity });
    for await (const linea of entrada) {
      const registro = JSON.parse(linea);
      if (!(registro.tenant_id in cantidades)) {
        throw new Error(`Tenant inválido en ${nombre}`);
      }
      cantidades[registro.tenant_id]++;
      total++;
    }
    if (Object.values(cantidades).some(c => c !== 10000)) {
      throw new Error(`Cantidad incorrecta en ${nombre}: ${JSON.stringify(cantidades)}`);
    }
    console.log(`${nombre}: ${JSON.stringify(cantidades)}`);
  }
  console.log(`Total: ${total} registros`);
}

verificar().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
