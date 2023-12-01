#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

BUILD_OPTS=""
CLEAN_DOs="--clean"
PROCESSOR_OPTS="--exclude-bad-values"

echo "Building Digital Objects..."
echo

set +e # Ignore errors
for obj in $(do-processor list | grep -v '^collection'); do
  do-processor $PROCESSOR_OPTS build $BUILD_OPTS $CLEAN_DOs $obj
done

echo "Building Collections..."
echo

for obj in $(do-processor list | grep '^collection'); do
  do-processor $PROCESSOR_OPTS normalize $BUILD_OPTS $obj
  do-processor $PROCESSOR_OPTS enrich $BUILD_OPTS $obj
  do-processor $PROCESSOR_OPTS deploy $BUILD_OPTS $obj
done
