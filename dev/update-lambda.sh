#!/usr/bin/env bash

[[ ! -z "$NAPPI_ROOT" ]] || { echo 'NAPPI_ROOT not defined'; exit 1; }

$NAPPI_ROOT/dev/zip-lambda.sh
aws lambda update-function-code --function-name nappi --zip-file fileb://$NAPPI_ROOT/temp/function.zip
