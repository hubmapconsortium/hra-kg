#!/bin/bash
source constants.sh
set -ev

export VERSION=v2.4
# Get all new or updated DOs, ignoring deleted, collection, and draft DOs
export EXTRA_DOs=$(git diff --name-status main..develop | grep -v '^D' | grep metadata.yaml | grep -v collection | grep -v draft | cut -d '/' -f 2,3,4 | sort | uniq)
export COLLECTIONS="collection/ds-graphs/v2025 collection/hra/$VERSION collection/hra-api/$VERSION collection/hra-ols/$VERSION collection/hra-millitomes/$VERSION"
export CLEAN="false"
export S3_HOME="s3://cdn-humanatlas-io/hra-kg--staging"

if [ "$CLEAN" = "true" ]; then
  rm -rf $DEPLOY_HOME
  mkdir -p $DEPLOY_HOME
  echo "*" > $DEPLOY_HOME/.gitignore
fi

BUILD_OPTS=""
CLEAN_DOs="--clean"
PROCESSOR_OPTS="--exclude-bad-values"
SKIP_BUILT_DOs="true"

# Determine Digital Objects to process
touch $DEPLOY_HOME/.digital-objects
for DO in $EXTRA_DOs; do
  echo $DO >> $DEPLOY_HOME/.digital-objects
done
for DO in $COLLECTIONS; do
  yq -r '.["digital-objects"][]' digital-objects/$DO/raw/digital-objects.yaml >> $DEPLOY_HOME/.digital-objects
done
export DOs=$(cat $DEPLOY_HOME/.digital-objects | sort | uniq | shuf)
echo "Digital Object Count: $(cat $DEPLOY_HOME/.digital-objects | sort | uniq | wc -l)"
rm -f $DEPLOY_HOME/.digital-objects

echo "Building Digital Objects..."
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

# Build unprocessed digital objects
for obj in $DOs; do
  if [ "${SKIP_BUILT_DOs}" = "false" ] || [ ! -e dist/${obj}/graph.ttl ] || [ ! -e digital-objects/${obj}/enriched/enriched.ttl ]; then
    mkdir -p dist/${obj}
    queue_job "./src/run-do-processor.sh $PROCESSOR_OPTS build $BUILD_OPTS $CLEAN_DOs $obj"
  fi
done

wait_for_empty_queue

# Run again on any that failed the first time
for obj in $DOs; do
  if [ ! -e dist/${obj}/graph.ttl ] || [ ! -e digital-objects/${obj}/enriched/enriched.ttl ]; then
    mkdir -p dist/${obj}
    queue_job "./src/run-do-processor.sh $PROCESSOR_OPTS build $BUILD_OPTS $CLEAN_DOs $obj"
  fi
done

wait_for_empty_queue

echo "Building Collections..."
echo

for obj in $COLLECTIONS; do
  do-processor $PROCESSOR_OPTS normalize $BUILD_OPTS $obj
  do-processor $PROCESSOR_OPTS enrich $BUILD_OPTS $obj
  do-processor $PROCESSOR_OPTS deploy $BUILD_OPTS $obj
done

time ./scripts/30-finalize.sh
time ./scripts/40-create-blazegraph-db.sh
time ./scripts/80-deploy.sh
time ./scripts/99x-build-doi-xml-zip.sh
