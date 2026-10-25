#!/usr/bin/env bash
# Deploy the latest build to the Rebble store (prep + open developer portal).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$ROOT/scripts/publish-rebble.sh" "$@"
