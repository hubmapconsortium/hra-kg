#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

TEMP_JNL='scratch/ALL-blazegraph.jnl'
rm -f $TEMP_JNL

GRAPHS=`find dist -name "*.ttl" | grep -v "/latest/" | sort`
blazegraph-runner --journal=$TEMP_JNL load --use-ontology-graph $GRAPHS
blazegraph-runner --journal=$TEMP_JNL select src/nodes.rq scratch/ALL-nodes.tsv

NODES=`tail -n +2 scratch/ALL-nodes.tsv | sort -u -S 75% | wc -l`
echo nodes $NODES

EDGES=`find dist -name "*.nt" -exec cat {} \; | wc -l`
echo edges $EDGES

SIZE=`du -s -BM dist | perl -pe 's/[^0-9]+//g'`
echo size $SIZE

echo "label,count,unit" > dist/high-level-stats.csv
echo "Nodes in the HRA Knowledge Graph,${NODES}," >> dist/high-level-stats.csv
echo "Edges in the HRA Knowledge Graph,${EDGES}," >> dist/high-level-stats.csv
echo "Size of the HRA Knowledge Graph,${SIZE},MB" >> dist/high-level-stats.csv

rm -f scratch/ALL-nodes.tsv $TEMP_JNL
