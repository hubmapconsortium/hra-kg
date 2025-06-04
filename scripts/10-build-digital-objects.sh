#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

BUILD_OPTS=""
CLEAN_DOs="--clean"
PROCESSOR_OPTS="--exclude-bad-values"
SKIP_BUILT_DOs="true"

echo "Building Digital Objects..."
echo

rm -f jobs.txt
queue_job() {
  echo "$1" >> jobs.txt
}
wait_for_empty_queue() {
  node ./src/parallel-jobs.js jobs.txt
  rm -f jobs.txt
}

for obj in $(do-processor list | grep -v '^collection' | shuf); do
  if [ "${SKIP_BUILT_DOs}" = "false" ] || [ ! -e dist/${obj}/graph.ttl ] || [ ! -e digital-objects/${obj}/enriched/enriched.ttl ]; then
    mkdir -p dist/${obj}
    queue_job "./src/run-do-processor.sh $PROCESSOR_OPTS build $BUILD_OPTS $CLEAN_DOs $obj"
  fi
done

wait_for_empty_queue
