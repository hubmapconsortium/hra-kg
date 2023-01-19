#!/bin/bash

gen-json-schema ${1}.yaml > ${1}.schema.json
linkml-convert -s ${1}.yaml -f json -t ${2} -o ${1}.gen.${2//-/} ${1}.data.json
