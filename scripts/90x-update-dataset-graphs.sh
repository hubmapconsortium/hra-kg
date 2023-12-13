#!/bin/bash
source constants.sh
shopt -s extglob
set -e

BUILD_OPTS="--clean --update-db"
PROCESSOR_OPTS="--skip-validation"
VERSION=v2023
DIGITAL_OBJECTS=$(do-processor list | grep "^ds-graph" | grep $VERSION)

# Go through each ds-graph digital object and download and update if they have a url.txt
for obj in $DIGITAL_OBJECTS; do
  raw=digital-objects/$obj/raw

  if [ -e $raw/url.txt ]; then 
    new_graph=$raw/dataset-graph.new.jsonld
    old_graph=$raw/dataset-graph.jsonld
    url=$(cat $raw/url.txt)

    curl -s $url -o $new_graph

    if [ "$1" == "clean" ]; then
      rm -f $old_graph
    fi

    if [ "$(diff --brief --new-file $new_graph $old_graph)" != "" ]; then
      mv $new_graph $old_graph
      do-processor $PROCESSOR_OPTS build $BUILD_OPTS $obj
      rsync -r dist/$obj/ $(dirname dist/$obj)/latest/
    else
      rm -f $new_graph
    fi
  fi
done

obj=collection/ds-graphs/$VERSION
do-processor $PROCESSOR_OPTS build $BUILD_OPTS $obj
rsync -r dist/$obj/ $(dirname dist/$obj)/latest/
