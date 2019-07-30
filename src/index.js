/*
 *
 */
const { responseError, handleEvent } = require('./api');

exports.handler = async event => {
  let b;
  try {
    b = JSON.parse(event.body);
  } catch (e) {
    return responseError(400, 'Invalid data');
  }
  return handleEvent(b);
};
