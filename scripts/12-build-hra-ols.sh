#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

# Remove individuals from hra-ols graph
do-processor deploy --remove-individuals collection/hra-ols/v2.2
