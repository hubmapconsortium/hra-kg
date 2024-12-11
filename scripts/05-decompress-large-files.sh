#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

CLEAN="false"
DECOMPRESSOR="xz -T0 -9e --memlimit-decompress=75% --decompress"

for file in `find digital-objects -name "*.xz" | grep raw`; do
  decompressed=`dirname $file`/`basename -s ".xz" $file`;
  if [ ! -e $decompressed ] || [ "$CLEAN" = "true" ]; then
    echo "Decompressing ${file}..."
    $DECOMPRESSOR -k $file
  fi
done
