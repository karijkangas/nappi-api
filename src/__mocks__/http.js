/*
 *
 */
const agent = {};

function Agent() {
  return agent;
}

const http = {
  Agent: jest.fn().mockImplementation(Agent),
};

module.exports = http;
