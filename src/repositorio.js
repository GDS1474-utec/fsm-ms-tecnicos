function crearRepositorio() {
  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    QueryCommand,
    UpdateCommand,
    DeleteCommand
  } = require('@aws-sdk/lib-dynamodb');

  const cliente = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true }
  });
  const tabla = process.env.TABLA_TECNICOS;

  if (!tabla) {
    throw new Error('Falta TABLA_TECNICOS');
  }

  return {
    async crear(item) {
      await cliente.send(new PutCommand({
        TableName: tabla,
        Item: item,
        ConditionExpression: 'attribute_not_exists(#t) AND attribute_not_exists(#i)',
        ExpressionAttributeNames: { '#t': 'tenant_id', '#i': 'tecnico_id' }
      }));
      return item;
    },

    async obtener(tenantId, tecnicoId) {
      const resultado = await cliente.send(new GetCommand({
        TableName: tabla,
        Key: { tenant_id: tenantId, tecnico_id: tecnicoId },
        ConsistentRead: true
      }));
      return resultado.Item || null;
    },

    async listar(tenantId, opciones) {
      const nombres = { '#t': 'tenant_id' };
      const valores = { ':t': tenantId };
      const condiciones = [];

      if (opciones.filtros.estado) {
        nombres['#estado'] = 'estado';
        valores[':estado'] = opciones.filtros.estado;
        condiciones.push('#estado = :estado');
      }
      if (opciones.filtros.especialidad) {
        nombres['#especialidad'] = 'especialidad';
        valores[':especialidad'] = opciones.filtros.especialidad;
        condiciones.push('#especialidad = :especialidad');
      }

      const resultado = await cliente.send(new QueryCommand({
        TableName: tabla,
        KeyConditionExpression: '#t = :t',
        ExpressionAttributeNames: nombres,
        ExpressionAttributeValues: valores,
        FilterExpression: condiciones.length ? condiciones.join(' AND ') : undefined,
        Limit: opciones.limite,
        ExclusiveStartKey: opciones.ultimo
      }));

      return {
        registros: resultado.Items || [],
        siguiente: resultado.LastEvaluatedKey || null
      };
    },

    async actualizar(tenantId, tecnicoId, cambios) {
      const nombres = { '#t': 'tenant_id', '#i': 'tecnico_id' };
      const valores = {};
      const expresiones = [];
      let indice = 0;

      for (const [campo, valor] of Object.entries(cambios)) {
        const nombre = `#c${indice}`;
        const marcador = `:v${indice}`;
        nombres[nombre] = campo;
        valores[marcador] = valor;
        expresiones.push(`${nombre} = ${marcador}`);
        indice++;
      }

      const resultado = await cliente.send(new UpdateCommand({
        TableName: tabla,
        Key: { tenant_id: tenantId, tecnico_id: tecnicoId },
        UpdateExpression: `SET ${expresiones.join(', ')}`,
        ExpressionAttributeNames: nombres,
        ExpressionAttributeValues: valores,
        ConditionExpression: 'attribute_exists(#t) AND attribute_exists(#i)',
        ReturnValues: 'ALL_NEW'
      }));
      return resultado.Attributes;
    },

    async eliminar(tenantId, tecnicoId) {
      const resultado = await cliente.send(new DeleteCommand({
        TableName: tabla,
        Key: { tenant_id: tenantId, tecnico_id: tecnicoId },
        ConditionExpression: 'attribute_exists(#t) AND attribute_exists(#i)',
        ExpressionAttributeNames: { '#t': 'tenant_id', '#i': 'tecnico_id' },
        ReturnValues: 'ALL_OLD'
      }));
      return resultado.Attributes;
    }
  };
}

module.exports = { crearRepositorio };
