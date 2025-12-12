#!/bin/bash
source constants.sh
set -ev

# do-processor update-collection collection/hra/v2.4
# do-processor update-collection collection/hra-api/v2.4
# do-processor update-collection collection/hra-ols/v2.4
# do-processor update-collection collection/hra-millitomes/v2.4

export VERSION=v2.4
export EXTRA_DOs=$(git diff --name-only main..develop | grep metadata.yaml | grep -v collection | grep -v draft | cut -d '/' -f 2,3,4 | sort | uniq)
export COLLECTIONS="collection/ds-graphs/v2025 collection/hra-millitomes/$VERSION collection/hra/$VERSION collection/hra-api/$VERSION collection/hra-ols/$VERSION collection/hra-millitomes/$VERSION"
export CLEAN="true"
export S3_HOME="s3://cdn-humanatlas-io/hra-kg--staging"

if [ "$CLEAN" = "true" ]; then
  rm -rf $DEPLOY_HOME
  mkdir -p $DEPLOY_HOME
  echo "*" > $DEPLOY_HOME/.gitignore
fi

# Determine Digital Objects to process
touch $DEPLOY_HOME/.digital-objects
echo "graph/hra-pop/v0.11.1" > $DEPLOY_HOME/.digital-objects #temp
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
  aws s3 sync $DEPLOY_HOME/$d/ $S3_HOME/$d/
done
echo "---- END Syncing built files to S3 ----"
echo

aws s3 sync $DEPLOY_HOME/ $S3_HOME/

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

aws s3 sync $DEPLOY_HOME/ $S3_HOME/
