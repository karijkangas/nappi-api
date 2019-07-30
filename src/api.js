/*
 *
 */
const Database = require('./database');
const { MAX_WINNER_NAME_LENGTH } = require('./config');

function isValidEvent(event) {
  return event && event.operation && event.data;
}

function isValidName(name) {
  return (
    name &&
    typeof name === 'string' &&
    name.length > 0 &&
    name.length <= MAX_WINNER_NAME_LENGTH
  );
}

function responseOk(data) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  };
}

function responseError(code, error) {
  return {
    statusCode: code,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ error }),
  };
}

async function setTop(data) {
  const { name } = data;
  if (!isValidName(name)) {
    return responseError(400, 'Invalid name');
  }
  await Database.putTop(name, { timestamp: Date.now() });

  return responseOk({});
}

async function getTopIdx() {
  const topIdx = await Database.getTopIdx();
  return responseOk({ topIdx });
}

async function getTop() {
  const top = await Database.getTop();
  return responseOk({ top });
}

const handlers = {
  setTop,
  getTopIdx,
  getTop,
};

async function handleEvent(event) {
  if (!isValidEvent(event)) {
    return responseError(400, 'Invalid event');
  }

  const { operation } = event;

  const handler = handlers[operation];
  if (!handler) {
    return responseError(400, 'Invalid operation');
  }
  return handler(event.data);
}

module.exports = {
  responseError,
  handleEvent,
};
