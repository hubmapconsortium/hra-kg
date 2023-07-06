#!/bin/bash

TO_BUILD="collection/hra/v1.3 collection/hra-ref-organs/v1.3"

for digitalObject in $TO_BUILD; do
  DO_PULL=true ./do-processor.sh --exclude-bad-values build $digitalObject
done
./do-processor.sh finalize
blazegraph-runner update --journal=./dist/blazegraph.jnl ./src/blazegraph.extras.rq
blazegraph-runner select --journal=./dist/blazegraph.jnl ./src/blazegraph.stats.rq ./scratch/blazegraph.stats.tsv
