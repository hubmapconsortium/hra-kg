#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

JNL='dist/ALL-blazegraph.jnl'
rm -f $JNL

# Load the catalog
blazegraph-runner --journal=$JNL load --graph=https://purl.humanatlas.io dist/catalog.ttl
blazegraph-runner --journal=$JNL load --graph=https://lod.humanatlas.io dist/catalog.ttl

# Load each digital object into a named graph (and redundant if available)
for obj in $(do-processor list); do
  TTL=dist/${obj}/graph.ttl
  if [ -e $TTL ]; then
    GRAPH="https://purl.humanatlas.io/${obj}"
    blazegraph-runner --journal=$JNL load --graph=$GRAPH $TTL
  fi

  REDUNDANT=dist/${obj}/redundant.ttl
  if [ -e $REDUNDANT ]; then
    GRAPH="https://purl.humanatlas.io/${obj}/redundant"
    blazegraph-runner --journal=$JNL load --graph=$GRAPH $REDUNDANT
  fi
done

#do-processor create-db --include-all-versions --journal $JNL

blazegraph-runner --journal=$JNL select src/nodes.rq scratch/ALL-nodes.tsv
blazegraph-runner --journal=$JNL select src/edge-count.rq scratch/edge-count.tsv

NODES=`tail -n +2 scratch/ALL-nodes.tsv | sort -u -S 75% | wc -l`
echo nodes $NODES

EDGES=`tail -1 scratch/edge-count.tsv | cut -d'"' -f 2`
echo edges $EDGES

EDGES2=`find dist -name "*.nt" -exec cat {} \; | wc -l`
echo edges2 $EDGES2

SIZE=`du -s -BM dist | perl -pe 's/[^0-9]+//g'`
echo size $SIZE

echo "label,count,unit" > dist/high-level-stats.csv
echo "Nodes in the HRA Knowledge Graph,${NODES}," >> dist/high-level-stats.csv
echo "Edges in the HRA Knowledge Graph,${EDGES}," >> dist/high-level-stats.csv
echo "Size of the HRA Knowledge Graph,${SIZE},MB" >> dist/high-level-stats.csv

rm -f scratch/ALL-nodes.tsv scratch/edge-count.tsv
