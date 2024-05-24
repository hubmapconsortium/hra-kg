#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

blazegraph-runner update --journal=./dist/blazegraph.jnl ./src/blazegraph.extras.rq
blazegraph-runner select --journal=./dist/blazegraph.jnl ./src/blazegraph.stats.rq ./dist/blazegraph.stats.tsv
blazegraph-runner select --journal=./dist/blazegraph.jnl ./src/high-level-stats.rq ./dist/blazegraph.high-level-stats.tsv
