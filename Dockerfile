# This docker file is used for populating and pushing the container for the official HRA KG with all data within
FROM ghcr.io/hubmapconsortium/hra-do-server:main
COPY dist /dist
