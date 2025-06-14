#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

# Run fix-hravs again just in case
./src/fix-hravs.sh

CLEAN="--delete"

if [ "${DEFAULT_CDN_IRI}" = "https://cdn.humanatlas.io/digital-objects/" ]; then
  rsync -ri $CLEAN --checksum ./dist/ ./staging/
  aws s3 sync $CLEAN ./staging/ s3://cdn-humanatlas-io/digital-objects/
fi

if [ "${DEFAULT_CDN_IRI}" = "https://cdn.humanatlas.io/hra-kg--staging/" ]; then
  aws s3 sync $CLEAN ./dist/ s3://cdn-humanatlas-io/hra-kg--staging/
fi
