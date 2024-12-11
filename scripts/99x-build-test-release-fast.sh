#!/bin/bash
source constants.sh
source src/parallel_jobs.sh
set -ev

export VERSION=v2.2
export DEPLOY_HOME=~/workspaces/hubmap/hra-kg/dist-${VERSION}
export EXTRA_DOs="graph/ccf/v2.3.0 graph/ds-graphs-enrichments/v2024"
export COLLECTIONS="collection/hra/$VERSION collection/hra-api/$VERSION collection/ds-graphs/v2024"
export CLEAN="false"

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

for obj in $DOs; do
  if [ "${SKIP_BUILT_DOs}" = "false" ] || [ ! -e ${DEPLOY_HOME}/${obj}/graph.ttl ]; then
    mkdir -p $DEPLOY_HOME/${obj}
    queue_job "do-processor $PROCESSOR_OPTS build $BUILD_OPTS $CLEAN_DOs $obj"
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

# Finalize deployment, including creating a fresh blazegraph.jnl
echo
echo "---- START FINALIZING ----"
do-processor finalize
blazegraph-runner select --journal=$DEPLOY_HOME/blazegraph.jnl ./src/blazegraph.stats.rq $DEPLOY_HOME/blazegraph.stats.tsv
blazegraph-runner select --journal=$DEPLOY_HOME/blazegraph.jnl ./src/high-level-stats.rq $DEPLOY_HOME/blazegraph.high-level-stats.tsv
echo "---- END FINALIZING ----"
echo

# Sync up to S3
echo
echo "---- START Syncing built files to S3 ----"
for d in $DOs $COLLECTIONS; do
  aws s3 sync $DEPLOY_HOME/$d/ s3://cdn-humanatlas-io/digital-objects/$d/
done
echo "---- END Syncing built files to S3 ----"
echo

# Computing release XMLs
export DOs=$(yq -r '.["digital-objects"][]' digital-objects/collection/hra/$VERSION/raw/digital-objects.yaml)

mkdir -p $DEPLOY_HOME/xmls
rm -rf $DEPLOY_HOME/xmls/*

for d in $DOs; do
  ID=$(yq -r '.hubmapId' digital-objects/$d/raw/metadata.yaml)
  cp $DEPLOY_HOME/$d/doi.xml $DEPLOY_HOME/xmls/${ID}.xml
done

zip -j $DEPLOY_HOME/hra-${VERSION}-doi-xmls.zip $DEPLOY_HOME/xmls/*.xml
rm -rf $DEPLOY_HOME/xmls
