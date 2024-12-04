#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

VERSION=v2.1
DIR=staging
ARCHIVE=scratch/hra-kg.${VERSION}.tar.xz

tar --transform="s/^${DIR}/hra-kg-${VERSION}/" -caf $ARCHIVE $DIR

aws s3 cp $ARCHIVE s3://cdn-humanatlas-io/hra-kg-releases/
