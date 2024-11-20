#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

CLEAN="--delete"

aws s3 sync $CLEAN s3://cdn-humanatlas-io/digital-objects/ ./staging/
