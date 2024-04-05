#!/bin/bash

node reformat.mjs

sparql-construct.sh https://lod.humanatlas.io/sparql crosswalk.rq \
  > _crosswalk.ttl && rdf-formatter _crosswalk.ttl crosswalk.ttl --pretty && rm _crosswalk.ttl
