#!/bin/bash

echo "export DB_URL=${DB_URL}" > /sync.env
echo "export BLAZEGRAPH_MEMORY=${BLAZEGRAPH_MEMORY}" >> /sync.env
echo "export BLAZEGRAPH_TIMEOUT=${BLAZEGRAPH_TIMEOUT}" >> /sync.env
echo "export BLAZEGRAPH_READONLY=${BLAZEGRAPH_READONLY}" >> /sync.env

/sync.sh && cron -f
