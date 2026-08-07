#!/bin/bash
set -euo pipefail

OWNER="${OWNER:-hubmapconsortium}"
REPO="${REPO:-hra-kg}"
REGISTRY="ghcr.io"
IMAGE_NAME="${IMAGE_NAME:-$REGISTRY/$OWNER/$REPO}"
TAG="${TAG:-latest}"
DOCKERFILE="${DOCKERFILE:-Dockerfile}"
CONTEXT="${CONTEXT:-.}"

if ! command -v docker >/dev/null 2>&1; then
	echo "docker is required but not installed." >&2
	exit 1
fi

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
	echo "${GITHUB_TOKEN}" | docker login ghcr.io -u "${GITHUB_ACTOR:-${OWNER}}" --password-stdin
elif ! docker system info >/dev/null 2>&1; then
	echo "Docker is not available or not logged in to ghcr.io." >&2
	exit 1
fi

echo "Building image ${IMAGE_NAME}:${TAG} using ${DOCKERFILE}"
docker build --network=host -f "${DOCKERFILE}" -t "${IMAGE_NAME}:${TAG}" "${CONTEXT}"

if [[ "${TAG}" != "latest" ]]; then
	docker tag "${IMAGE_NAME}:${TAG}" "${IMAGE_NAME}:latest"
fi

echo "Pushing ${IMAGE_NAME}:${TAG}"
docker push "${IMAGE_NAME}:${TAG}"

if [[ "${TAG}" != "latest" ]]; then
	echo "Pushing ${IMAGE_NAME}:latest"
	docker push "${IMAGE_NAME}:latest"
fi

echo "Done: ${IMAGE_NAME}:${TAG}"
