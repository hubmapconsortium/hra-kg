#!/bin/bash
source ../hra-do-processor/.venv/bin/activate
set -ev

export VERSION=v2.1
export DEPLOY_HOME=/home/bherr/workspaces/hubmap/hra-kg/dist-${VERSION}
export EXTRA_DOs="graph/ccf/v2.3.0 graph/ds-graphs-enrichments/v2023"
export COLLECTIONS="collection/hra/$VERSION collection/hra-api/$VERSION collection/ds-graphs/v2023"

rm -rf $DEPLOY_HOME
mkdir -p $DEPLOY_HOME
echo "*" > $DEPLOY_HOME/.gitignore

touch $DEPLOY_HOME/.digital-objects
for DO in $EXTRA_DOs; do
  echo $DO >> $DEPLOY_HOME/.digital-objects
done
for DO in $COLLECTIONS; do
  yq -r '.["digital-objects"][]' digital-objects/$DO/raw/digital-objects.yaml >> $DEPLOY_HOME/.digital-objects
done
export DOs=$(sort $DEPLOY_HOME/.digital-objects | uniq)
rm -f $DEPLOY_HOME/.digital-objects

for d in $DOs $EXTRA_DOs; do
  echo
  echo "---- START NORMALIZE ${d} ----"
  do-processor --exclude-bad-values normalize $d
  echo "---- END NORMALIZE ${d} ----"
  echo
done

for d in $DOs $EXTRA_DOs; do
  echo
  echo "---- START ENRICH ${d} ----"
  do-processor enrich $d
  echo "---- END ENRICH ${d} ----"
  echo
done

for d in $DOs $EXTRA_DOs; do
  echo
  echo "---- START DEPLOY ${d} ----"
  do-processor deploy $d
  echo "---- END DEPLOY ${d} ----"
  echo
done

for d in $COLLECTIONS; do
  echo
  echo "---- START COLLECTION ${d} ----"
  do-processor normalize $d
  do-processor enrich $d
  do-processor deploy $d
  echo "---- END COLLECTION ${d} ----"
  echo
done

echo
echo "---- START FINALIZING ----"
do-processor finalize
blazegraph-runner select --journal=$DEPLOY_HOME/blazegraph.jnl ./src/blazegraph.stats.rq $DEPLOY_HOME/blazegraph.stats.tsv
blazegraph-runner select --journal=$DEPLOY_HOME/blazegraph.jnl ./src/high-level-stats.rq $DEPLOY_HOME/blazegraph.high-level-stats.tsv
echo "---- END FINALIZING ----"
echo

echo
echo "---- START Syncing built files to S3 ----"
for d in $DOs $EXTRA_DOs $COLLECTIONS; do
  aws s3 sync $DEPLOY_HOME/$d/ s3://cdn-humanatlas-io/digital-objects/$d/
done
echo "---- END Syncing built files to S3 ----"
echo
