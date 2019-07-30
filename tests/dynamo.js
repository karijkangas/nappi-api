/*
 *
 */
const AWS = require('aws-sdk');

let docClient;
let TABLE_TOP;
let TABLE_TOP_COUNTER_IDX;

function initialize(params) {
  docClient = new AWS.DynamoDB.DocumentClient(params);
  ({ TABLE_TOP, TABLE_TOP_COUNTER_IDX } = params);
}

async function getTopIdx() {
  const params = {
    TableName: TABLE_TOP,
    Key: { id: TABLE_TOP_COUNTER_IDX },
  };
  return (await docClient.get(params).promise()).Item.nextIdx - 1;
}

async function getTop() {
  const params = {
    TableName: TABLE_TOP,
    FilterExpression: 'idx > :i',
    ExpressionAttributeValues: { ':i': 0 },
  };
  const top = (await docClient.scan(params).promise()).Items;
  return top.sort((a, b) => b.idx - a.idx);
}

async function getNextIdx() {
  const params = {
    TableName: TABLE_TOP,
    Key: { idx: TABLE_TOP_COUNTER_IDX },
  };
  return (await docClient.get(params).promise()).Item;
}

async function incNextIdx(n) {
  const p1 = {
    TableName: TABLE_TOP,
    Key: {
      idx: TABLE_TOP_COUNTER_IDX,
    },
    UpdateExpression: 'SET nextIdx = nextIdx + :inc',
    ExpressionAttributeValues: {
      ':inc': n,
    },
    ReturnValues: 'ALL_OLD',
  };
  const c = await docClient.update(p1).promise();
  const { nextIdx } = c.Attributes;
  return nextIdx;
}

function toBatches(array, size) {
  const batches = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
}

async function deleteItems(keys, table) {
  const batchSize = 20;
  const batches = toBatches(keys, batchSize);

  for (let b = 0; b < batches.length; b += 1) {
    const batch = batches[b];
    const p = { RequestItems: { [table]: [] } };

    for (let i = 0; i < batch.length; i += 1) {
      p.RequestItems[table].push({ DeleteRequest: { Key: batch[i] } });
    }
    await docClient.batchWrite(p).promise();
  }
}

async function resetTop() {
  const p1 = {
    TableName: TABLE_TOP,
    FilterExpression: 'idx > :i',
    ExpressionAttributeValues: { ':i': 0 },
  };
  const top = (await docClient.scan(p1).promise()).Items;

  await deleteItems(top.map(t => ({ idx: t.idx })), TABLE_TOP);

  const p2 = {
    RequestItems: {
      [TABLE_TOP]: [
        {
          PutRequest: {
            Item: {
              idx: TABLE_TOP_COUNTER_IDX,
              nextIdx: 1,
            },
          },
        },
      ],
    },
  };
  return docClient.batchWrite(p2).promise();
}

async function reset() {
  return resetTop();
}

module.exports = {
  initialize,
  getTopIdx,
  getTop,
  getNextIdx,
  incNextIdx,
  resetTop,
  reset,
};
