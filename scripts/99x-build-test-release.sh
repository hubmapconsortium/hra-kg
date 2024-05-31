#!/bin/bash
source ../hra-do-processor/.venv/bin/activate

export VERSION=v2.1
export DEPLOY_HOME=/home/bherr/workspaces/hubmap/hra-kg/dist-${VERSION}
export COLL=collection/hra/$VERSION
export API_COLL=collection/hra-api/$VERSION

rm -rf $DEPLOY_HOME
mkdir -p $DEPLOY_HOME
echo "*" > $DEPLOY_HOME/.gitignore

yq -r '.["digital-objects"][]' digital-objects/$COLL/raw/digital-objects.yaml > $DEPLOY_HOME/.digital-objects
yq -r '.["digital-objects"][]' digital-objects/$API_COLL/raw/digital-objects.yaml >> $DEPLOY_HOME/.digital-objects
export DOs=$(sort $DEPLOY_HOME/.digital-objects | uniq)

for d in $DOs; do
  echo
  echo "---- START ${d} ----"
  do-processor --exclude-bad-values build --clean $d
  echo "---- END ${d} ----"
  echo
done

for d in $API_COLL $COLL; do
  echo
  echo "---- START ${d} ----"
  do-processor normalize $d
  do-processor enrich $d
  do-processor deploy $d
  echo "---- END ${d} ----"
  echo
done

echo
echo "---- START FINALIZING ----"
do-processor finalize
blazegraph-runner select --journal=$DEPLOY_HOME/blazegraph.jnl ./src/blazegraph.stats.rq $DEPLOY_HOME/blazegraph.stats.tsv
blazegraph-runner select --journal=$DEPLOY_HOME/blazegraph.jnl ./src/high-level-stats.rq $DEPLOY_HOME/blazegraph.high-level-stats.tsv
echo "---- END FINALIZING ----"
echo
