#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

for file in `find digital-objects -name "*.*" -size +75M | grep raw | grep -v .dvc$ | grep -v .xz$`; do
  if [ ! -e "${file}.dvc" ]; then
    echo "Adding ${file} to DVC..."
    dvc add $file
  fi
done
