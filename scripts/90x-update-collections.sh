#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

BUILD_OPTS=""
DEPLOY_OPTS="--update-db"
PROCESSOR_OPTS="--exclude-bad-values"
DIGITAL_OBJECTS=$@

for obj in $DIGITAL_OBJECTS; do
  do-processor $PROCESSOR_OPTS normalize $BUILD_OPTS $obj
  do-processor $PROCESSOR_OPTS enrich $BUILD_OPTS $obj
  do-processor $PROCESSOR_OPTS deploy $DEPLOY_OPTS $BUILD_OPTS $obj
done
