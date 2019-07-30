/*
 *
 */
/* eslint-disable global-require */

jest.mock('../api');

const Api = require('../api');
const { handler } = require('../index');

describe('index.js', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('handler works with valid event', async () => {
    const body = { first: 1, second: 'two' };
    const event = { body: JSON.stringify(body) };
    const r = 'returnValue';
    Api.handleEvent.mockReturnValueOnce(r);

    await expect(handler(event)).resolves.toEqual(r);
    expect(Api.handleEvent).toBeCalledTimes(1);
    expect(Api.handleEvent).toHaveBeenNthCalledWith(1, body);
    expect(Api.responseError).not.toBeCalled();
  });

  test('handler works with unexpected event', async () => {
    const event = { message: 'hello' };
    const r = 'returnValue';
    Api.responseError.mockReturnValueOnce(r);

    await expect(handler(event)).resolves.toEqual(r);
    expect(Api.responseError).toBeCalledTimes(1);
    expect(Api.responseError).toHaveBeenNthCalledWith(1, 400, 'Invalid data');
    expect(Api.handleEvent).not.toBeCalled();
  });

  test('handler works with invalid event', async () => {
    const body = { first: 1, second: 'two' };
    const event = { body };
    const r = 'returnValue';
    Api.responseError.mockReturnValueOnce(r);

    await expect(handler(event)).resolves.toEqual(r);
    expect(Api.responseError).toBeCalledTimes(1);
    expect(Api.responseError).toHaveBeenNthCalledWith(1, 400, 'Invalid data');
    expect(Api.handleEvent).not.toBeCalled();
    Api.responseError.mockReturnValueOnce(r);
  });
});
