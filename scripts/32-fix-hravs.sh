#!/bin/bash
source constants.sh
shopt -s extglob
set -ev

cp ./src/hravs-index.html ./dist/vocab/hravs/latest/index.html
