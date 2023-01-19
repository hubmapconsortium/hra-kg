#!/bin/bash

gen-json-schema ${1}.yaml > ${1}.schema.json
check-jsonschema --schemafile ${1}.schema.json ${1}.data.json
