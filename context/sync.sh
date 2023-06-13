#!/bin/bash
source /sync.env

LOCAL_DB=/data/blazegraph.jnl
ETAG_FILE=${LOCAL_DB}.etag

REMOTE_ETAG=$(curl -sIX GET $DB_URL | grep -i etag | cut -d\" -f 2)
LOCAL_ETAG=$(touch $ETAG_FILE && cat $ETAG_FILE)

if [ "$REMOTE_ETAG" != "$LOCAL_ETAG" ]; then
  echo "Syncing DB with" $REMOTE_ETAG

  curl --compressed -H 'Accept-encoding: gzip' -so $LOCAL_DB $DB_URL
  echo $REMOTE_ETAG > $ETAG_FILE

  # Kill blazegraph (and let the daemon restart it)
  killall -9 -q java
fi
