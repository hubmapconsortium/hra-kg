#!/bin/bash
source constants.sh
shopt -s extglob
set -e

do-processor $@
