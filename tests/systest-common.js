/*
 *
 */
/* eslint-disable object-shorthand, func-names */

const request = require('supertest');

const Dynamo = require('./dynamo');

let API_ENDPOINT;

module.exports = {
  initialize: function initialize(params) {
    const { dynamo } = params;
    Dynamo.initialize(dynamo);
    ({ API_ENDPOINT } = params);
  },
  RESET: async function RESET() {
    await Dynamo.reset();
  },
  request: function() {
    return request(API_ENDPOINT);
  },
  randomString: function randomString(length) {
    return [...Array(length)]
      .map(() => (~~(Math.random() * 36)).toString(36)) // eslint-disable-line no-bitwise
      .join('');
  },
  postRequest: async function postRequest(data, status, error) {
    const req = this.request();
    const r = await req
      .post('/')
      .set('Content-Type', 'application/json')
      .send(data)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(status);

    if (error) {
      expect(r.body).toEqual(error);
      return undefined;
    }

    return r.body;
  },
  setTop: async function setTop(name, status = 200, error = undefined) {
    const r = await this.postRequest(
      { operation: 'setTop', data: { name } },
      status,
      error
    );

    return r;
  },
  getTopIdx: async function getTopIdx(status = 200, error = undefined) {
    const r = await this.postRequest(
      { operation: 'getTopIdx', data: {} },
      status,
      error
    );

    return r;
  },
  getTop: async function getTop(status = 200, error = undefined) {
    const r = await this.postRequest(
      { operation: 'getTop', data: {} },
      status,
      error
    );

    return r;
  },
  dynamoGetTopIdx: function dynamoGetTopIdx() {
    return Dynamo.getTopIdx();
  },
  dynamoGetTop: async function dynamoGetTop() {
    const top = await Dynamo.getTop();
    return top.sort((a, b) => b.idx - a.idx);
  },
  dynamoResetTop: function dynamoResetTop() {
    return Dynamo.resetTop();
  },
};
