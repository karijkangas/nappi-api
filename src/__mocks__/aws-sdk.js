/*
 *
 */
const docClient = {
  update: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  batchWrite: jest.fn(),
  scan: jest.fn(),
};

function DocumentClient() {
  return docClient;
}

const AWS = {
  DynamoDB: {
    DocumentClient: jest.fn().mockImplementation(DocumentClient),
  },
};

module.exports = AWS;
