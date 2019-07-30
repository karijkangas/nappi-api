#!/usr/bin/env bash

[[ ! -z "$NAPPI_ROOT" ]] || { echo 'NAPPI_ROOT not defined'; exit 1; }

TEMP=$NAPPI_ROOT/temp
BUILD=$TEMP/build

echo rm -rf $BUILD
mkdir -p $TEMP $BUILD
cp $NAPPI_ROOT/src/*.js $BUILD
cp package.json $BUILD
cd $BUILD; npm install --production --no-package-lock
cd $BUILD; zip -r $TEMP/function.zip .
