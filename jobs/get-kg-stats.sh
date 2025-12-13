#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

JNL=scratch/ALL-nodes.jnl
ALL_NODES=scratch/ALL-nodes.tsv
rm -f $ALL_NODES
for NT in `find dist -name "*.nt" | shuf`; do
  rm -f $JNL
  blazegraph-runner --journal=$JNL load $NT
  blazegraph-runner --journal=$JNL select src/nodes.rq scratch/ALL-nodes-1.tsv
  tail -n +2 scratch/ALL-nodes-1.tsv >> $ALL_NODES
done

NODES=`tail -n +2 $ALL_NODES | sort -u -S 75% | wc -l`
echo nodes $NODES
rm -f scratch/ALL-nodes-1.tsv $ALL_NODES $JNL

EDGES=`find dist -name "*.nt" -exec cat {} \; | wc -l`
echo edges $EDGES

SIZE=`du -s -BM dist | perl -pe 's/[^0-9]+//g'`
echo size $SIZE MB, `du -hs dist`

echo "label,count,unit" > dist/high-level-stats.csv
echo "Nodes in the HRA Knowledge Graph,${NODES}," >> dist/high-level-stats.csv
echo "Edges in the HRA Knowledge Graph,${EDGES}," >> dist/high-level-stats.csv
echo "Size of the HRA Knowledge Graph,${SIZE},MB" >> dist/high-level-stats.csv

rm -f $ALL_NODES
