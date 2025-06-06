#!/bin/bash
source constants.sh
set -ev

VERSION=v2.3
export COLLECTIONS=$(do-processor list | grep "^collection/hra/${VERSION}" | sort);
OUT=scratch/hra-asctb-json-releases

mkdir -p $OUT
rm -f $OUT/*

for COLL in $COLLECTIONS; do
  VERSION=$(echo $COLL | cut -d '/' -f 3);
  do-processor gen-asct-b-collection-json $COLL --output $OUT/hra-asctb-all.$VERSION.json
done

aws s3 sync ${OUT}/ s3://cdn-humanatlas-io/hra-asctb-json-releases/
