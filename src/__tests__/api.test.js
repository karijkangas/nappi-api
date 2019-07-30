/*
 *
 */
/* eslint-disable global-require */

jest.mock('../database');

const Database = require('../database');
const Config = require('../config');

const Api = require('../api');

function randomString(length) {
  return [...Array(length)]
    .map(() => (~~(Math.random() * 36)).toString(36)) // eslint-disable-line no-bitwise
    .join('');
}

describe('api.js', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('responseError', () => {
    test('It should return valid error', async () => {
      const code = 123;
      const error = { hello: 'world' };

      expect(Api.responseError(code, error)).toEqual({
        statusCode: code,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error }),
      });
    });
  });

  describe('handleEvent', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    test('setTop should return valid object', async () => {
      const data = { name: 'John Winner' };
      const event = { operation: 'setTop', data };
      Database.putTop.mockResolvedValueOnce(true);

      await expect(Api.handleEvent(event)).resolves.toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(Database.putTop).toBeCalledTimes(1);
      expect(Database.putTop).toHaveBeenNthCalledWith(1, data.name, {
        timestamp: expect.any(Number),
      });
    });

    test('setTop should reject invalid names', async () => {
      const invalidData = [
        {},
        { name: undefined },
        { name: 123 },
        { name: '' },
        { name: randomString(Config.MAX_WINNER_NAME_LENGTH + 1) },
      ];
      for (let i = 0; i < invalidData.length; i += 1) {
        const event = { operation: 'setTop', data: invalidData[i] };

        await expect(Api.handleEvent(event)).resolves.toEqual({
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid name' }),
        });
      }
      expect(Database.putTop).not.toBeCalled();
    });

    test('setTop should throw on database error', async () => {
      const data = { name: 'John Winner' };
      const event = { operation: 'setTop', data };
      Database.putTop.mockRejectedValueOnce(new Error('TEST'));

      await expect(Api.handleEvent(event)).rejects.toThrow(/TEST/);

      expect(Database.putTop).toBeCalledTimes(1);
      expect(Database.putTop).toHaveBeenNthCalledWith(1, data.name, {
        timestamp: expect.any(Number),
      });
    });

    test('getTopIdx should return valid object', async () => {
      const event = { operation: 'getTopIdx', data: {} };
      const topIdx = 123;
      Database.getTopIdx.mockResolvedValueOnce(topIdx);

      await expect(Api.handleEvent(event)).resolves.toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topIdx }),
      });

      expect(Database.getTopIdx).toBeCalledTimes(1);
    });

    test('getTopIdx should throw on database error', async () => {
      const event = { operation: 'getTopIdx', data: {} };
      Database.getTopIdx.mockRejectedValueOnce(new Error('TEST'));

      await expect(Api.handleEvent(event)).rejects.toThrow(/TEST/);

      expect(Database.getTopIdx).toBeCalledTimes(1);
    });

    test('getTop should return valid object', async () => {
      const event = { operation: 'getTop', data: {} };
      const top = [{ idx: 1 }, { idx: 2 }];
      Database.getTop.mockResolvedValueOnce(top);

      await expect(Api.handleEvent(event)).resolves.toEqual({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ top }),
      });

      expect(Database.getTop).toBeCalledTimes(1);
    });

    test('getTop should throw on database error', async () => {
      const event = { operation: 'getTop', data: {} };
      Database.getTop.mockRejectedValueOnce(new Error('TEST'));

      await expect(Api.handleEvent(event)).rejects.toThrow(/TEST/);

      expect(Database.getTop).toBeCalledTimes(1);
    });

    test('handleEvent should reject invalid events', async () => {
      const invalidEvents = [
        undefined,
        'hello',
        {},
        { operation: 'getTop' },
        { data: {} },
      ];
      for (let i = 0; i < invalidEvents.length; i += 1) {
        Database.putTop.mockResolvedValueOnce(true);

        await expect(Api.handleEvent(invalidEvents[i])).resolves.toEqual({
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid event' }),
        });
      }
    });

    test('handleEvent should reject invalid operation', async () => {
      const event = { operation: 'foobar', data: {} };

      await expect(Api.handleEvent(event)).resolves.toEqual({
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid operation' }),
      });
    });
  });

  // test('handler works with valid event', async () => {
  //   const body = { first: 1, second: 'two' };
  //   const event = { body: JSON.stringify(body) };
  //   const r = 'returnValue';
  //   Api.handleEvent.mockReturnValueOnce(r);

  //   await expect(handler(event)).resolves.toEqual(r);
  //   expect(Api.handleEvent).toBeCalledTimes(1);
  //   expect(Api.handleEvent).toHaveBeenNthCalledWith(1, body);
  //   expect(Api.responseError).not.toBeCalled();
  // });

  // test('handler works with unexpected event', async () => {
  //   const event = { message: 'hello' };
  //   const r = 'returnValue';
  //   Api.responseError.mockReturnValueOnce(r);

  //   await expect(handler(event)).resolves.toEqual(r);
  //   expect(Api.responseError).toBeCalledTimes(1);
  //   expect(Api.responseError).toHaveBeenNthCalledWith(1, 400, 'Invalid data');
  //   expect(Api.handleEvent).not.toBeCalled();
  // });

  // test('handler works with invalid event', async () => {
  //   const body = { first: 1, second: 'two' };
  //   const event = { body };
  //   const r = 'returnValue';
  //   Api.responseError.mockReturnValueOnce(r);

  //   await expect(handler(event)).resolves.toEqual(r);
  //   expect(Api.responseError).toBeCalledTimes(1);
  //   expect(Api.responseError).toHaveBeenNthCalledWith(1, 400, 'Invalid data');
  //   expect(Api.handleEvent).not.toBeCalled();
  //   Api.responseError.mockReturnValueOnce(r);
  // });
});
