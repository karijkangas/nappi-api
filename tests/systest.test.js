/*
 *
 */
Error.stackTraceLimit = Infinity;
jest.setTimeout(30 * 1000);

const com = require('./systest-common');

const params = {
  API_ENDPOINT: 'http://localhost:8001',
  dynamo: {
    endpoint: 'http://localhost:8000/',
    region: 'localhost',
    TABLE_TOP: 'nappi-top',
    TABLE_TOP_COUNTER_IDX: -1,
  },
};

// BEWARE; this will reset DynamoDB table on AWS
// const params = {
//   API_ENDPOINT: 'https://api.karijkangas.com/nappi',
//   dynamo: {
//     region: 'eu-west-1',
//     TABLE_TOP: 'nappi-top',
//     TABLE_TOP_COUNTER_IDX: -1,
//   },
// };

const invalidNames = [
  undefined,
  '',
  1288,
  { hello: 'world' },
  com.randomString(256),
];

com.initialize(params);

beforeAll(async () => {
  await com.RESET();
});

afterAll(async () => {
  await com.RESET();
});

describe('setTop', () => {
  beforeEach(async () => {
    await com.dynamoResetTop();
  });

  test('It should add new name to top', async () => {
    expect(await com.dynamoGetTop()).toHaveLength(0);

    const name = com.randomString(16);
    const t = await com.setTop(name);
    expect(t).toEqual({});

    const top = await com.dynamoGetTop();
    expect(top).toHaveLength(1);
    expect(top[0].name).toEqual(name);
    expect(top[0].timestamp).toBeLessThanOrEqual(Date.now());
  });

  test('It should allow adding the same name multiple times', async () => {
    expect(await com.dynamoGetTop()).toHaveLength(0);

    const name = com.randomString(16);
    let t = await com.setTop(name);
    expect(t).toEqual({});

    t = await com.setTop(name);
    expect(t).toEqual({});

    const top = await com.dynamoGetTop();
    expect(top).toHaveLength(2);
    expect(top[0].name).toEqual(name);
    expect(top[1].name).toEqual(name);
    expect(top[0].timestamp).toBeGreaterThanOrEqual(top[1].timestamp);
  });

  test('It should reject invalid name', async () => {
    expect(await com.dynamoGetTop()).toHaveLength(0);

    for (let i = 0; i < invalidNames.length; i += 1) {
      await com.setTop(invalidNames[i], 400, { error: 'Invalid name' });
    }

    expect(await com.dynamoGetTop()).toHaveLength(0);
  });
});

describe('getTopIdx', () => {
  beforeEach(async () => {
    await com.dynamoResetTop();
  });

  test('It should return 0 with empty top', async () => {
    expect(await com.dynamoGetTop()).toHaveLength(0);

    const r = await com.getTopIdx();
    expect(r.topIdx).toEqual(0);
  });

  test('It should return incremented idx after setTop', async () => {
    expect(await com.dynamoGetTop()).toHaveLength(0);
    expect((await com.getTopIdx()).topIdx).toEqual(0);

    const name1 = com.randomString(16);
    const name2 = com.randomString(16);
    const name3 = com.randomString(16);

    await com.setTop(name1);
    let r = await com.getTopIdx();
    expect(r.topIdx).toEqual(1);

    await com.setTop(name1);
    r = await com.getTopIdx();
    expect(r.topIdx).toEqual(2);

    await com.setTop(name2);
    r = await com.getTopIdx();
    expect(r.topIdx).toEqual(3);

    await com.setTop(name3);
    r = await com.getTopIdx();
    expect(r.topIdx).toEqual(4);
  });
});

const TABLE_TOP_MAX_SIZE = 7;

describe('getTop', () => {
  beforeEach(async () => {
    await com.dynamoResetTop();
  });

  test('It should return empty top', async () => {
    expect(await com.dynamoGetTop()).toHaveLength(0);

    const { top } = await com.getTop();
    expect(top).toHaveLength(0);
  });

  test('It should return top array', async () => {
    expect(await com.dynamoGetTop()).toHaveLength(0);

    const total = TABLE_TOP_MAX_SIZE;
    const names = [];

    for (let i = 0; i < total; i += 1) {
      const name = `${i} ${com.randomString(16)}`;
      await com.setTop(name);
      names.unshift(name);

      const { top } = await com.getTop();
      expect(top.length).toEqual(names.length);
      for (let k = 0; k < top.length; k += 1) {
        expect(top[k].idx).toEqual(top.length - k);
        expect(top[k].name).toEqual(names[k]);
        expect(top[k].timestamp).toBeLessThanOrEqual(Date.now());
      }
    }

    let { top } = await com.getTop();
    for (let k = 1; k < top.length; k += 1) {
      expect(top[k].timestamp).toBeLessThanOrEqual(top[k - 1].timestamp);
    }

    top = await com.dynamoGetTop();
    expect(top).toHaveLength(names.length);
    for (let i = 0; i < names.length; i += 1) {
      expect(top[i].idx).toEqual(names.length - i);
      expect(top[i].name).toEqual(names[i]);
    }
  });

  test('It should prune duplicates', async () => {
    expect(await com.dynamoGetTop()).toHaveLength(0);

    const name1 = com.randomString(16);
    const name2 = com.randomString(16);
    const name3 = com.randomString(16);

    await com.setTop(name1);
    await com.setTop(name1);
    await com.setTop(name2);
    await com.setTop(name2);
    await com.setTop(name1);
    await com.setTop(name3);
    await com.setTop(name2);
    await com.setTop(name3);
    await com.setTop(name2);
    await com.setTop(name3);
    await com.setTop(name1);
    await com.setTop(name1);

    let top = await com.dynamoGetTop();
    expect(top).toHaveLength(12);

    ({ top } = await com.getTop());
    expect(top).toHaveLength(3);
    expect(top[0].name).toEqual(name1);
    expect(top[0].idx).toEqual(12);
    expect(top[1].name).toEqual(name3);
    expect(top[1].idx).toEqual(10);
    expect(top[2].name).toEqual(name2);
    expect(top[2].idx).toEqual(9);

    top = await com.dynamoGetTop();
    expect(top).toHaveLength(3);
    expect(top[0].name).toEqual(name1);
    expect(top[1].name).toEqual(name3);
    expect(top[2].name).toEqual(name2);
  });

  test('It should limit top size', async () => {
    expect(await com.dynamoGetTop()).toHaveLength(0);

    const total = TABLE_TOP_MAX_SIZE * 2;
    const names = [];

    for (let i = 0; i < total; i += 1) {
      const name = `${i} ${com.randomString(16)}`;
      await com.setTop(name);
      names.unshift(name);
    }

    let top = await com.dynamoGetTop();
    expect(top).toHaveLength(names.length);
    for (let i = 0; i < names.length; i += 1) {
      expect(top[i].name).toEqual(names[i]);
    }

    ({ top } = await com.getTop());
    expect(top).toHaveLength(TABLE_TOP_MAX_SIZE);
    for (let k = 0; k < top.length; k += 1) {
      expect(top[k].name).toEqual(names[k]);
    }

    top = await com.dynamoGetTop();
    expect(top).toHaveLength(TABLE_TOP_MAX_SIZE);
  });
});
