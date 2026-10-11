#!/usr/bin/env bash
# Runs the backend against the local docker-compose database using values from .env.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; . ./.env; set +a; fi
cd backend
exec ./mvnw -B spring-boot:run -Dspring-boot.run.profiles="${SPRING_PROFILES_ACTIVE:-dev}"
