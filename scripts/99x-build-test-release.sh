#!/bin/bash
source ../hra-do-processor/.venv/bin/activate
set -ev

export VERSION=v2.2
export DEPLOY_HOME=~/workspaces/hubmap/hra-kg/dist-${VERSION}
export EXTRA_DOs="graph/ccf/v2.3.0 graph/ds-graphs-enrichments/v2024"
export COLLECTIONS="collection/hra/$VERSION collection/hra-api/$VERSION collection/ds-graphs/v2024"
export CLEAN="true"

# export EXTRA_DOs=$(git diff --name-only main..develop | grep metadata.yaml | grep -v collection | grep -v draft | cut -d '/' -f 2,3,4 | sort | uniq)
# export EXTRA_DOs="ref-organ/lymph-node-male/v1.4"
# export COLLECTIONS=""

if [ "$CLEAN" = "true" ]; then
  rm -rf $DEPLOY_HOME
  mkdir -p $DEPLOY_HOME
  echo "*" > $DEPLOY_HOME/.gitignore
fi

# Determine Digital Objects to process
touch $DEPLOY_HOME/.digital-objects
for DO in $EXTRA_DOs; do
  echo $DO >> $DEPLOY_HOME/.digital-objects
done
for DO in $COLLECTIONS; do
  yq -r '.["digital-objects"][]' digital-objects/$DO/raw/digital-objects.yaml >> $DEPLOY_HOME/.digital-objects
done
export DOs=$(sort $DEPLOY_HOME/.digital-objects | uniq)
rm -f $DEPLOY_HOME/.digital-objects

# Normalize digital objects
for d in $DOs; do
  if [ ! -e digital-objects/$d/normalized/normalized.yaml ] || [ "$CLEAN" = "true" ]; then
    echo
    echo "---- START NORMALIZE ${d} ----"
    do-processor --exclude-bad-values normalize $d
    echo "---- END NORMALIZE ${d} ----"
    echo
  fi
done

# Enrich digital objects
for d in $DOs; do
  if [ ! -e digital-objects/$d/enriched/enriched.ttl ] || [ "$CLEAN" = "true" ]; then
    echo
    echo "---- START ENRICH ${d} ----"
    do-processor enrich $d
    echo "---- END ENRICH ${d} ----"
    echo
  fi
done

# Deploy digital objects
for d in $DOs; do
  if [ ! -e $DEPLOY_HOME/$d/graph.ttl ] || [ "$CLEAN" = "true" ]; then
    echo
    echo "---- START DEPLOY ${d} ----"
    do-processor deploy $d
    echo "---- END DEPLOY ${d} ----"
    echo
  fi
done

# Process collections
for d in $COLLECTIONS; do
  echo
  echo "---- START COLLECTION ${d} ----"
  do-processor normalize $d
  do-processor enrich $d
  do-processor deploy $d
  echo "---- END COLLECTION ${d} ----"
  echo
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
