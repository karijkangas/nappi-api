/*
 *
 */
process.env.AWS_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID';
process.env.AWS_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY';
process.env.AWS_REGION = 'eu-west-1';

process.env.AWS_DYNAMODB_ENDPOINT = 'http://localhost:8000';
process.env.NAPPI_TABLE_TOP = 'nappi-top';

process.env.LAMBDA_SERVER_PORT = '8001';

const express = require('express');
const cors = require('cors');
const { format, transports } = require('winston');
const expressWinston = require('express-winston');

const { handler } = require('../src/index');

const apiPort = parseInt(process.env.LAMBDA_SERVER_PORT, 10);
let httpServer; // eslint-disable-line no-unused-vars

function sendReply(res, reply) {
  res.status(reply.statusCode).json(JSON.parse(reply.body));
}

function sendError(res, errorCode, error) {
  res.status(errorCode).json({ error });
}

const asyncmw = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

async function initialize() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const httpLogger = expressWinston.logger({
    transports: [new transports.Console()],
    format: format.combine(
      format.colorize(),
      format.timestamp(),
      format.json()
    ),
  });

  app.use(httpLogger);

  const router = express.Router();
  router.post(
    '/',
    asyncmw(async (req, res) => {
      const r = await handler({
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      sendReply(res, r);
    })
  );

  app.use(router);

  // eslint-disable-next-line no-unused-vars
  app.use((req, res, next) => {
    sendError(res, 404, 'Not found');
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.status === 400) {
      return sendError(res, 400, 'Invalid data');
    }
    // eslint-disable-next-line no-console
    console.error(`Server error: ${err}\n${err.stack}`);
    return sendError(res, 500, 'Internal service error');
  });

  return app;
}

(async () => {
  httpServer = (await initialize()).listen(apiPort, () => {
    // eslint-disable-next-line no-console
    console.log(`lambda-server started, listening port ${apiPort}`);
  });
})();
