#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

# Prepare dist folder for publication
do-processor finalize --skip-db $FINALIZE_OPTS

# Fix the HRAVS page
./src/fix-hravs.sh
