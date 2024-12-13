#!/bin/bash

VERSION=v2.2
PREV=v2.1
export DEPLOY_HOME=dist

COLL=collection/hra/$VERSION
PREV_COLL=collection/hra/$PREV

yq -r '.["digital-objects"][]' digital-objects/$COLL/raw/digital-objects.yaml | sort > 1
yq -r '.["digital-objects"][]' digital-objects/$PREV_COLL/raw/digital-objects.yaml | sort > 2

export DOs=$(diff 1 2 --suppress-common-lines | grep "<" | perl -pe "s/\<\ //g")

mkdir -p $DEPLOY_HOME/xmls
rm -rf $DEPLOY_HOME/xmls/*

for d in $DOs; do
  ID=$(yq -r '.hubmapId' digital-objects/$d/raw/metadata.yaml)
  if [ "$ID" == "null" ]; then
    echo $d needs a DOI.
  else
    cp $DEPLOY_HOME/$d/doi.xml $DEPLOY_HOME/xmls/${ID}.xml
  fi
done

zip -j $DEPLOY_HOME/hra-${VERSION}-doi-xmls.zip $DEPLOY_HOME/xmls/*.xml
rm -rf $DEPLOY_HOME/xmls 1 2
