# Nappi API

Nappi API provides a backend for Uunobutton, still online.

Nappi API is build using AWS API Gateway, Lambda, and DynamoDB. The Lambda code is written using Node.js.

## Unit and coverage tests

```bash
# set NAPPI_ROOT environment variable used in shell scripts
source ./setroot.sh
echo $NAPPI_ROOT

# run unit tests
npm run test

# run coverage test
npm run coverage
```

## Local development service

Local development service uses a simple Express server (tests/lambda-server.js) for running Lambda code. The local API endpoint is `http://localhost:8001`.

```bash
# start local DynamoDB
docker run --rm -p 8000:8000 amazon/dynamodb-local -jar DynamoDBLocal.jar -inMemory -sharedDb

# set DYNAMODB_ENDPOINT environment variable
export DYNAMODB_ENDPOINT=http://localhost:8000/

# reset local DynamoDB tables
./dev/reset-dynamodb.sh

# start development lambda service; in separate shell
npm run lambda-server

# run system tests
npm run systest
```

## Update Lambda on AWS

```bash
./dev/update-lambda.zip
```

Note: the Lambda requires a working AWS setup; IAM role, IAM policy, DynamoDB table, Lambda setup, and API Gateway LAMBDA_PROXY configuration.
