#!/bin/bash
source constants.sh

VERSION=v2.3
PREV=v2.2
CLEAN="true"

COLL=collection/hra/$VERSION
PREV_COLL=collection/hra/$PREV
ZIP=$DEPLOY_HOME/hra-${VERSION}-doi-xmls.zip

yq -r '.["digital-objects"][]' digital-objects/$COLL/raw/digital-objects.yaml | sort > 1
yq -r '.["digital-objects"][]' digital-objects/$PREV_COLL/raw/digital-objects.yaml | sort > 2

export DOs=$(diff 1 2 --suppress-common-lines | grep "<" | perl -pe "s/\<\ //g")

mkdir -p $DEPLOY_HOME/xmls
rm -rf $DEPLOY_HOME/xmls/* $ZIP

for d in $DOs; do
  ID=$(yq -r '.hubmapId' digital-objects/$d/raw/metadata.yaml)
  if [ "$ID" == "null" ]; then
    echo $d needs a DOI.
  else
    if [ "$CLEAN" == "true" ]; then
      mkdir -p $DEPLOY_HOME/$d
      do-processor deploy-doi-xml $d
    fi
    cp $DEPLOY_HOME/$d/doi.xml $DEPLOY_HOME/xmls/${ID}.xml
  fi
done

zip -j $ZIP $DEPLOY_HOME/xmls/*.xml
rm -rf $DEPLOY_HOME/xmls 1 2
