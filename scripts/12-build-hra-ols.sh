#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

VERSION=v2.3

# Remove individuals from hra-ols graph
do-processor deploy --remove-individuals collection/hra-ols/$VERSION
