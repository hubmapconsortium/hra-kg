#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

BUILD_OPTS="--clean"
PROCESSOR_OPTS="--exclude-bad-values"
DIGITAL_OBJECTS=`do-processor list`

set +e # Ignore errors
for obj in $DIGITAL_OBJECTS; do
  do-processor $PROCESSOR_OPTS build $BUILD_OPTS $obj
done
