#!/bin/bash
source /sync.env
PATH=$PATH:/usr/local/openjdk-8/bin

LOCAL_DB=/data/blazegraph.jnl
ETAG_FILE=${LOCAL_DB}.etag

REMOTE_ETAG=$(curl -sIX GET $DB_URL | grep -i etag | cut -d\" -f 2)
LOCAL_ETAG=$(touch $ETAG_FILE && cat $ETAG_FILE)

if [ "$REMOTE_ETAG" != "$LOCAL_ETAG" ]; then
  echo "Syncing DB with" $REMOTE_ETAG

  curl --compressed -H 'Accept-encoding: gzip' -so $LOCAL_DB $DB_URL
  echo $REMOTE_ETAG > $ETAG_FILE

  killall -q java
  cd /data
  /blazegraph/entrypoint.sh &
fi
