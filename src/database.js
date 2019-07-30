/*
 *
 */
const AWS = require('aws-sdk');
const http = require('http');

const {
  DYNAMODB_ENDPOINT,
  DYNAMODB_TABLE_TOP,
  DYNAMODB_TABLE_TOP_COUNTER_IDX,
  DYNAMODB_TABLE_TOP_MAX_SIZE,
  DYNAMODB_MAX_DELETE_BATCH_SIZE,
} = require('./config');

const params = {
  sslEnabled: false,
  httpOptions: {
    agent: new http.Agent({ keepAlive: true }),
  },
};

if (DYNAMODB_ENDPOINT) {
  params.endpoint = DYNAMODB_ENDPOINT;
}

const docClient = new AWS.DynamoDB.DocumentClient(params);

async function putTop(name, extra) {
  const p1 = {
    TableName: DYNAMODB_TABLE_TOP,
    Key: {
      idx: DYNAMODB_TABLE_TOP_COUNTER_IDX,
    },
    UpdateExpression: 'SET nextIdx = nextIdx + :inc',
    ExpressionAttributeValues: {
      ':inc': 1,
    },
    ReturnValues: 'ALL_OLD',
  };
  const c = await docClient.update(p1).promise();
  const { nextIdx } = c.Attributes;

  const p3 = {
    TableName: DYNAMODB_TABLE_TOP,
    Item: {
      ...extra,
      idx: nextIdx,
      name,
    },
  };
  return docClient.put(p3).promise();
}

async function getTopIdx() {
  const p1 = {
    TableName: DYNAMODB_TABLE_TOP,
    Key: {
      idx: DYNAMODB_TABLE_TOP_COUNTER_IDX,
    },
  };
  const r = await docClient.get(p1).promise();
  return r.Item.nextIdx - 1;
}

function topExclude(top, excluded) {
  return top.filter(t => !excluded.find(e => e.idx === t.idx));
}

function topUniques(top) {
  const uniques = [];
  top.forEach(t => {
    if (!uniques.find(u => u.name === t.name)) {
      uniques.push(t);
    }
  });
  return uniques;
}

function toBatches(array, size) {
  const batches = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
}

async function deleteItems(keys, table) {
  const batchSize = DYNAMODB_MAX_DELETE_BATCH_SIZE;
  const batches = toBatches(keys, batchSize);
  const promises = [];

  for (let b = 0; b < batches.length; b += 1) {
    const batch = batches[b];
    const p = { RequestItems: { [table]: [] } };

    for (let i = 0; i < batch.length; i += 1) {
      p.RequestItems[table].push({ DeleteRequest: { Key: batch[i] } });
    }
    promises.push(docClient.batchWrite(p).promise());
  }
  return Promise.all(promises);
}

async function getTop() {
  const p = {
    TableName: DYNAMODB_TABLE_TOP,
    FilterExpression: 'idx > :i',
    ExpressionAttributeValues: { ':i': 0 },
  };
  const top = (await docClient.scan(p).promise()).Items;
  const uniques = topUniques(top.sort((a, b) => b.idx - a.idx)).slice(
    0,
    DYNAMODB_TABLE_TOP_MAX_SIZE
  );

  const waste = topExclude(top, uniques);
  await deleteItems(waste.map(e => ({ idx: e.idx })), DYNAMODB_TABLE_TOP);

  return uniques;
}

module.exports = {
  putTop,
  getTopIdx,
  getTop,
};
