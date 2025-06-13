#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

VERSION=v2.3
DIR=staging
ARCHIVE=scratch/hra-kg.${VERSION}.tar.xz
mkdir -p scratch

COMPRESSOR='xz -T0 -9 -e --memlimit-compress=75%'

tar --transform="s/^${DIR}/hra-kg-${VERSION}/" -c -I "$COMPRESSOR" -f $ARCHIVE $DIR

aws s3 cp $ARCHIVE s3://cdn-humanatlas-io/hra-kg-releases/
