#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

BUILD_OPTS=""
CLEAN_DOs="--clean"
PROCESSOR_OPTS="--exclude-bad-values"

echo "Building Collections..."
echo

rm -f jobs.txt
queue_job() {
  echo "$1" >> jobs.txt
}
wait_for_empty_queue() {
  if [ -e jobs.txt ]; then
    node ./src/parallel-jobs.js jobs.txt
    rm -f jobs.txt
  fi
}

# Normalize
for obj in $(do-processor list | grep '^collection' | shuf); do
  mkdir -p dist/${obj}
  queue_job "./src/run-do-processor.sh $PROCESSOR_OPTS normalize $BUILD_OPTS $obj"
done
wait_for_empty_queue
sleep 2

# Enrich
for obj in $(do-processor list | grep '^collection' | shuf); do
  queue_job "./src/run-do-processor.sh $PROCESSOR_OPTS enrich $BUILD_OPTS $obj"
done
wait_for_empty_queue
sleep 2

# Deploy
for obj in $(do-processor list | grep '^collection' | shuf); do
  queue_job "./src/run-do-processor.sh $PROCESSOR_OPTS deploy $BUILD_OPTS $obj"
done
wait_for_empty_queue
