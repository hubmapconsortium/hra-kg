#!/bin/bash
# Pull the latest draft ASCT+B tables from Google Sheets into digital-objects/asct-b/<name>/draft/raw
# Usage: jobs/pull-asctb-drafts.sh [--dry-run] [--force] [--json report.json] [name ...]
source constants.sh
set -e

node ./src/pull-asctb-drafts.js "$@"
