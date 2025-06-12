#!/bin/bash

sparql-construct.sh http://localhost:8080/blazegraph/namespace/kb/sparql enrichments.rq \
  > _enrichments.ttl && rdf-formatter _enrichments.ttl enrichments.ttl --pretty && rm _enrichments.ttl
