#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

rsync -ri --checksum ./dist/ ./staging/

aws s3 sync ./staging/ s3://cdn-humanatlas-io/digital-objects/
