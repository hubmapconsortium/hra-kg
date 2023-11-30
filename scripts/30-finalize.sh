#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

FINALIZE_OPTS=""

do-processor finalize $FINALIZE_OPTS
