#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

# Create a fresh blazegraph db
do-processor create-db

# Add all versions of the HRA collection
for obj in `ls -d digital-objects/collection/hra/v* | perl -pe 's/digital-objects\///g'`; do
  blazegraph-runner --journal=dist/blazegraph.jnl load --graph="https://purl.humanatlas.io/${obj}" dist/${obj}/graph.ttl
done

blazegraph-runner update --journal=./dist/blazegraph.jnl ./src/blazegraph.extras.rq
blazegraph-runner select --journal=./dist/blazegraph.jnl ./src/blazegraph.stats.rq ./dist/blazegraph.stats.tsv
blazegraph-runner select --journal=./dist/blazegraph.jnl ./src/high-level-stats.rq ./dist/blazegraph.high-level-stats.tsv
blazegraph-runner select --journal=./dist/blazegraph.jnl ./src/reference-entity-ids.rq ./dist/reference-entity-ids.tsv
perl -i -pe 's/\?//g' ./dist/reference-entity-ids.tsv
