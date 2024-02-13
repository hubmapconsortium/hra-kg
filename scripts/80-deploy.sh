#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

# Run fix-hravs again just in case
./scripts/32-fix-hravs.sh

CLEAN="--delete"

rsync -ri $CLEAN --checksum ./dist/ ./staging/

aws s3 sync $CLEAN ./staging/ s3://cdn-humanatlas-io/digital-objects/
