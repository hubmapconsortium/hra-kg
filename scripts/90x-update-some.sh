#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

BUILD_OPTS="--clean --update-db"
PROCESSOR_OPTS="--exclude-bad-values"
DIGITAL_OBJECTS=$@

for obj in $DIGITAL_OBJECTS; do
  do-processor $PROCESSOR_OPTS build $BUILD_OPTS $obj

  if [ "$(echo $obj | cut -d '/' -f 3)" != "draft" ]; then
    rsync -r dist/$obj/ $(dirname dist/$obj)/latest/
  fi
done
