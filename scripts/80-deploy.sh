#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

# Run fix-hravs again just in case
./src/fix-hravs.sh

CLEAN="--delete"

if [ "${CDN_S3_BUCKET}" != "" ]; then
  aws s3 sync $CLEAN ./dist/ ${CDN_S3_BUCKET}
fi
