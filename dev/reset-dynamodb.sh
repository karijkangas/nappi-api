#!/usr/bin/env bash

if [[ -z "$DYNAMODB_ENDPOINT" ]]
then
  echo DYNAMODB_ENDPOINT not defined\; accessing real DynamoDB!
  read -p "Are you sure? " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]
  then
      [[ "$0" = "$BASH_SOURCE" ]] && exit 1 || return 1
  fi
  EP=
else
  EP="--endpoint-url $DYNAMODB_ENDPOINT"
fi

CMD="aws $EP dynamodb"

$CMD delete-table --table-name nappi-top
$CMD wait table-not-exists --table-name nappi-top
$CMD create-table --table-name nappi-top --attribute-definitions AttributeName=idx,AttributeType=N --key-schema AttributeName=idx,KeyType=HASH --billing-mode PAY_PER_REQUEST
$CMD wait table-exists --table-name nappi-top

$CMD put-item --table-name nappi-top --item '{"idx": {"N": "-1"}, "nextIdx": {"N": "1"}}'