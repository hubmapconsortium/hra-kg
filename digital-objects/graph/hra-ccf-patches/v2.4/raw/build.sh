#!/bin/bash

node reformat.mjs

sparql-construct.sh http://localhost:8080/blazegraph/namespace/kb/sparql crosswalk.rq \
  > _crosswalk.ttl && rdf-formatter _crosswalk.ttl crosswalk.ttl --pretty && rm _crosswalk.ttl

sparql-construct.sh http://localhost:8080/blazegraph/namespace/kb/sparql hra-versions.rq \
  > _hra-versions.ttl && rdf-formatter _hra-versions.ttl hra-versions.ttl --pretty && rm _hra-versions.ttl
