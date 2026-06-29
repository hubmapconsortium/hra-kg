#!/bin/bash

sparql-construct.sh http://localhost:8080/blazegraph/namespace/kb/sparql asctb-term-occurences-index.rq \
  > _indexes.ttl && rdf-formatter _indexes.ttl indexes.ttl --pretty && rm _indexes.ttl
