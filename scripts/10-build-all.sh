#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

BUILD_OPTS=""
CLEAN_DOs="--clean"
PROCESSOR_OPTS="--exclude-bad-values"
SKIP_BUILT_DOs="false"

echo "Building Digital Objects..."
echo

for obj in $(do-processor list | grep -v '^collection' | sort); do
  if [ "${SKIP_BUILT_DOs}" = "true" ] && [ ! -e dist/${obj}/graph.ttl ]; then
    do-processor $PROCESSOR_OPTS build $BUILD_OPTS $CLEAN_DOs $obj
  fi
done

echo "Building Collections..."
echo

for obj in $(do-processor list | grep '^collection'); do
  do-processor $PROCESSOR_OPTS normalize $BUILD_OPTS $obj
  do-processor $PROCESSOR_OPTS enrich $BUILD_OPTS $obj
  do-processor $PROCESSOR_OPTS deploy $BUILD_OPTS $obj
done
