const { createReadStream } = require('node:fs');
const { createInterface } = require('node:readline');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const cliente = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true }
});

const dormir = ms => new Promise(resolve => setTimeout(resolve, ms));

async function guardarLote(tabla, registros) {
  let pendientes = registros.map(registro => ({ PutRequest: { Item: registro } }));
  for (let intento = 0; intento < 12 && pendientes.length; intento++) {
    try {
      const resultado = await cliente.send(new BatchWriteCommand({
        RequestItems: { [tabla]: pendientes }
      }));
      pendientes = resultado.UnprocessedItems?.[tabla] || [];
    } catch (error) {
      if (!['ThrottlingException', 'ProvisionedThroughputExceededException', 'RequestLimitExceeded'].includes(error.name)) {
        throw error;
      }
    }
    if (pendientes.length) {
      await dormir(Math.min(250 * 2 ** intento, 10000) + Math.floor(Math.random() * 150));
    }
  }
  if (pendientes.length) {
    throw new Error(`No se pudieron insertar ${pendientes.length} registros`);
  }
}

async function cargar(archivo, tabla) {
  if (!archivo || !tabla) {
    throw new Error('Debe indicar archivo y tabla');
  }

  const entrada = createInterface({ input: createReadStream(archivo), crlfDelay: Infinity });
  const lotes = [];
  let actual = [];
  let cantidad = 0;

  async function enviar() {
    if (!lotes.length) return;
    await Promise.all(lotes.splice(0).map(lote => guardarLote(tabla, lote)));
    console.log(`Procesados: ${cantidad}`);
  }

  for await (const linea of entrada) {
    if (!linea.trim()) continue;
    const registro = JSON.parse(linea);
    if (typeof registro.tenant_id !== 'string') {
      throw new Error(`Falta tenant_id en línea ${cantidad + 1}`);
    }
    actual.push(registro);
    cantidad++;
    if (actual.length === 25) {
      lotes.push(actual);
      actual = [];
    }
    if (lotes.length === 4) {
      await enviar();
    }
  }

  if (actual.length) lotes.push(actual);
  await enviar();
  console.log(`Carga terminada: ${cantidad} registros en ${tabla}`);
  return cantidad;
}

module.exports = { cargar };
