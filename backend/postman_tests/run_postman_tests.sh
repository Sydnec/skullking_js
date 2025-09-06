#!/usr/bin/env bash
# Script minimal pour exécuter la collection Postman via newman (doit être installé globalement ou dans le workspace)
# Usage: ./run_postman_tests.sh [collection.json] [environment.json]
COLLECTION=${1:-./postman_collection.json}
ENV=${2:-}
if ! command -v newman >/dev/null 2>&1; then
  echo "newman n'est pas installé. Installez: npm install -g newman ou npm --workspace backend install newman"
  exit 1
fi
if [ -n "$ENV" ]; then
  newman run "$COLLECTION" -e "$ENV" --reporters cli,junit --reporter-junit-export ./postman_tests_report.xml
else
  newman run "$COLLECTION" --reporters cli,junit --reporter-junit-export ./postman_tests_report.xml
fi
