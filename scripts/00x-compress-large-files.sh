#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

COMPRESSOR="xz -T0 -9e --memlimit-compress=75% --compress"

for file in `find digital-objects -name "*.*" -size +75M | grep raw | grep -v .xz$`; do
  echo "Compressing ${file}..."
  $COMPRESSOR -k $file
  echo "/`basename $file`" > `dirname $file`/.gitignore
done
