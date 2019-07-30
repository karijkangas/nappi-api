/*
 *
 */
/* eslint-disable global-require */

jest.mock('aws-sdk');
jest.mock('http');

let AWS;
let http;
let Config;
let Database;

const ENDPOINT = 'TEST-ENDPOINT';
const TABLE_TOP = 'TEST-TOP';

describe('database.js', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    jest.useFakeTimers();

    AWS = require('aws-sdk');
    http = require('http');

    process.env.AWS_DYNAMODB_ENDPOINT = ENDPOINT;
    process.env.NAPPI_TABLE_TOP = TABLE_TOP;

    Config = require('../config');

    expect(Config.DYNAMODB_ENDPOINT).toEqual(ENDPOINT);
    expect(Config.DYNAMODB_TABLE_TOP).toEqual(TABLE_TOP);
  });

  describe('initialize', () => {
    test('initialize should work without endpoint', async () => {
      expect(AWS.DynamoDB.DocumentClient).not.toBeCalled();
      expect(http.Agent).not.toBeCalled();
      Config.DYNAMODB_ENDPOINT = undefined;
      Database = require('../database');
      expect(AWS.DynamoDB.DocumentClient).toBeCalledTimes(1);
      expect(AWS.DynamoDB.DocumentClient).toHaveBeenNthCalledWith(1, {
        sslEnabled: false,
        httpOptions: {
          agent: expect.any(Object),
        },
      });
      expect(http.Agent).toBeCalledTimes(1);
      expect(http.Agent).toHaveBeenNthCalledWith(1, { keepAlive: true });
    });

    test('initialize should work with endpoint', async () => {
      expect(AWS.DynamoDB.DocumentClient).not.toBeCalled();
      expect(http.Agent).not.toBeCalled();
      Database = require('../database');
      expect(AWS.DynamoDB.DocumentClient).toBeCalledTimes(1);
      expect(AWS.DynamoDB.DocumentClient).toHaveBeenNthCalledWith(1, {
        sslEnabled: false,
        httpOptions: {
          agent: expect.any(Object),
        },
        endpoint: ENDPOINT,
      });
      expect(http.Agent).toBeCalledTimes(1);
      expect(http.Agent).toHaveBeenNthCalledWith(1, { keepAlive: true });
    });
  });

  describe('putTop', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.resetAllMocks();
      jest.useFakeTimers();

      AWS = require('aws-sdk');

      process.env.NAPPI_TABLE_TOP = TABLE_TOP;
      Config = require('../config');
      expect(Config.DYNAMODB_TABLE_TOP).toEqual(TABLE_TOP);

      expect(AWS.DynamoDB.DocumentClient).not.toBeCalled();
      Database = require('../database');
      expect(AWS.DynamoDB.DocumentClient).toBeCalledTimes(1);
    });

    test('setTop should work', async () => {
      const name = 'TEST-NAME';
      const extra = { extra: 'TEST-EXTRA' };
      const nextIdx = 123;
      const result = { result: 'TEST-RESULT' };

      const docClient = new AWS.DynamoDB.DocumentClient();
      docClient.update.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValueOnce({ Attributes: { nextIdx } }),
      });
      docClient.put.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValueOnce(result),
      });

      await expect(Database.putTop(name, extra)).resolves.toEqual(result);

      expect(docClient.update).toBeCalledTimes(1);
      expect(docClient.update).toHaveBeenNthCalledWith(1, {
        TableName: TABLE_TOP,
        Key: { idx: Config.DYNAMODB_TABLE_TOP_COUNTER_IDX },
        UpdateExpression: 'SET nextIdx = nextIdx + :inc',
        ExpressionAttributeValues: {
          ':inc': 1,
        },
        ReturnValues: 'ALL_OLD',
      });

      expect(docClient.put).toBeCalledTimes(1);
      expect(docClient.put).toHaveBeenNthCalledWith(1, {
        TableName: TABLE_TOP,
        Item: {
          ...extra,
          idx: nextIdx,
          name,
        },
      });
    });

    test('getTopIdx should work', async () => {
      const nextIdx = 123;

      const docClient = new AWS.DynamoDB.DocumentClient();
      docClient.get.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValueOnce({ Item: { nextIdx } }),
      });

      await expect(Database.getTopIdx()).resolves.toEqual(nextIdx - 1);

      expect(docClient.get).toBeCalledTimes(1);
      expect(docClient.get).toHaveBeenNthCalledWith(1, {
        TableName: TABLE_TOP,
        Key: { idx: Config.DYNAMODB_TABLE_TOP_COUNTER_IDX },
      });
    });

    test('getTop should work', async () => {
      const top = [
        { idx: 3, name: 'tres' },
        { idx: 2, name: 'dos' },
        { idx: 1, name: 'uno' },
      ];
      expect(top.length).toBeLessThan(Config.DYNAMODB_TABLE_TOP_MAX_SIZE);

      const docClient = new AWS.DynamoDB.DocumentClient();
      docClient.scan.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValueOnce({ Items: top }),
      });

      await expect(Database.getTop()).resolves.toEqual(top);

      expect(docClient.scan).toBeCalledTimes(1);
      expect(docClient.scan).toHaveBeenNthCalledWith(1, {
        TableName: TABLE_TOP,
        FilterExpression: 'idx > :i',
        ExpressionAttributeValues: { ':i': 0 },
      });
      expect(docClient.batchWrite).not.toBeCalled();
    });

    test('getTop should return result sorted by reverse idx order', async () => {
      const top = [
        { idx: 1, name: 'uno' },
        { idx: 2, name: 'dos' },
        { idx: 3, name: 'tres' },
      ];
      expect(top.length).toBeLessThan(Config.DYNAMODB_TABLE_TOP_MAX_SIZE);

      const docClient = new AWS.DynamoDB.DocumentClient();
      docClient.scan.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValueOnce({ Items: top }),
      });

      await expect(Database.getTop()).resolves.toEqual([
        { idx: 3, name: 'tres' },
        { idx: 2, name: 'dos' },
        { idx: 1, name: 'uno' },
      ]);

      expect(docClient.scan).toBeCalledTimes(1);
      expect(docClient.scan).toHaveBeenNthCalledWith(1, {
        TableName: TABLE_TOP,
        FilterExpression: 'idx > :i',
        ExpressionAttributeValues: { ':i': 0 },
      });
      expect(docClient.batchWrite).not.toBeCalled();
    });

    test('getTop should limit the result', async () => {
      const totalCount =
        Config.DYNAMODB_TABLE_TOP_MAX_SIZE +
        Config.DYNAMODB_MAX_DELETE_BATCH_SIZE * 2 +
        1;
      const total = [];
      for (let i = 0; i < totalCount; i += 1) {
        const t = { idx: i, name: `name-${i}` };
        total.push(t);
      }

      const docClient = new AWS.DynamoDB.DocumentClient();
      docClient.scan.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValueOnce({ Items: total }),
      });
      docClient.batchWrite.mockReturnValue({
        promise: jest.fn().mockResolvedValueOnce(true),
      });

      const expectedTop = total
        .sort((a, b) => b.idx - a.idx)
        .slice(0, Config.DYNAMODB_TABLE_TOP_MAX_SIZE);

      const r = await Database.getTop();
      expect(r).toEqual(expectedTop);

      expect(docClient.scan).toBeCalledTimes(1);
      expect(docClient.scan).toHaveBeenNthCalledWith(1, {
        TableName: TABLE_TOP,
        FilterExpression: 'idx > :i',
        ExpressionAttributeValues: { ':i': 0 },
      });

      const expectedOverflow = total
        .sort((a, b) => b.idx - a.idx)
        .slice(Config.DYNAMODB_TABLE_TOP_MAX_SIZE)
        .map(t => ({ idx: t.idx }));
      const batches = Math.ceil(
        expectedOverflow.length / Config.DYNAMODB_MAX_DELETE_BATCH_SIZE
      );
      expect(docClient.batchWrite).toBeCalledTimes(batches);

      let deleted = [];
      for (let i = 0; i < batches; i += 1) {
        deleted = deleted.concat(
          docClient.batchWrite.mock.calls[i][0].RequestItems[TABLE_TOP].map(
            dr => dr.DeleteRequest.Key
          )
        );
      }
      expect(deleted).toEqual(expectedOverflow);
    });

    test('getTop should remove duplicates', async () => {
      const top = [
        { idx: 4, name: 'tres' },
        { idx: 3, name: 'dos' },
        { idx: 2, name: 'tres' },
        { idx: 1, name: 'uno' },
      ];

      const docClient = new AWS.DynamoDB.DocumentClient();
      docClient.scan.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValueOnce({ Items: top }),
      });
      docClient.batchWrite.mockReturnValue({
        promise: jest.fn().mockResolvedValueOnce(true),
      });

      await expect(Database.getTop()).resolves.toEqual([
        { idx: 4, name: 'tres' },
        { idx: 3, name: 'dos' },
        { idx: 1, name: 'uno' },
      ]);

      expect(docClient.scan).toBeCalledTimes(1);
      expect(docClient.scan).toHaveBeenNthCalledWith(1, {
        TableName: TABLE_TOP,
        FilterExpression: 'idx > :i',
        ExpressionAttributeValues: { ':i': 0 },
      });

      expect(docClient.batchWrite).toBeCalledTimes(1);
      expect(docClient.batchWrite).toHaveBeenNthCalledWith(1, {
        RequestItems: {
          [TABLE_TOP]: [{ DeleteRequest: { Key: { idx: 2 } } }],
        },
      });
    });
  });
});
