#!/bin/bash

# Save execution environment
echo "export DB_URL=${DB_URL}" > /sync.env

# Download initial DB
/sync.sh

# Start cron to periodically check for DB updates
cron

# Run blazegraph forever (unless stopped here)
while true; do /blazegraph/entrypoint.sh && break; done
