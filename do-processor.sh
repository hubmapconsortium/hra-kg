#!/bin/bash

CONTAINER=ghcr.io/hubmapconsortium/hra-do-processor:main
if [ "$LOCAL_BUILD" == "true" ]; then
  CONTAINER=hra-do-processor:latest
fi

SUDO="sudo"
if [ "$USE_SUDO" == "false" ]; then
  SUDO=""
fi

PULL="missing"
if [ "$DO_PULL" == "true" ]; then
  PULL="always"
fi

$SUDO docker run --pull $PULL --rm \
  --mount type=bind,source=./digital-objects,target=/digital-objects \
  --mount type=bind,source=./dist,target=/dist \
  -it $CONTAINER $@

# Fix permissions as docker-generated files are owned by root
$SUDO chown -R $USER digital-objects dist
