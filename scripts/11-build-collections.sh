#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

BUILD_OPTS=""
CLEAN_DOs="--clean"
PROCESSOR_OPTS="--exclude-bad-values"

echo "Building Collections..."
echo

for obj in $(do-processor list | grep '^collection'); do
  do-processor $PROCESSOR_OPTS normalize $BUILD_OPTS $obj
  do-processor $PROCESSOR_OPTS enrich $BUILD_OPTS $obj
  do-processor $PROCESSOR_OPTS deploy $BUILD_OPTS $obj
done

# # Normalize
# for obj in $(do-processor list | grep '^collection' | shuf); do
#   mkdir -p dist/${obj}
#   queue_job "./src/run-do-processor.sh $PROCESSOR_OPTS normalize $BUILD_OPTS $obj"
# done
# wait_for_empty_queue

# # Enrich
# for obj in $(do-processor list | grep '^collection' | shuf); do
#   queue_job "./src/run-do-processor.sh $PROCESSOR_OPTS enrich $BUILD_OPTS $obj"
# done
# wait_for_empty_queue

# # Deploy
# for obj in $(do-processor list | grep '^collection' | shuf); do
#   queue_job "./src/run-do-processor.sh $PROCESSOR_OPTS deploy $BUILD_OPTS $obj"
# done
# wait_for_empty_queue
