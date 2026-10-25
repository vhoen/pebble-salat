#!/usr/bin/env bash
# Prepare a Rebble store release: bump version, test, build, open developer portal.
# There is no public Rebble upload API; the .pbw must be attached manually in the browser.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORTAL_URL="https://developer.repebble.com/dashboard"
PBW_NAME="pebble-salat.pbw"
PBW_PATH="$ROOT/build/$PBW_NAME"

BUMP="patch"
NOTES=""
SKIP_TESTS=0
SKIP_OPEN=0

usage() {
  cat <<'EOF'
Usage: publish-rebble.sh [options]

Prepare the latest build for a Rebble store release, then open the developer portal.

Options:
  --bump patch|minor|major   Bump package.json version (default: patch)
  --no-bump                  Keep the current version
  --notes TEXT               Release notes to print in the summary
  --skip-tests               Skip npm test
  --no-open                  Do not open the browser
  -h, --help                 Show this help

Example:
  npm run publish:rebble -- --bump patch --notes "Fix Aladhan DD-MM-YYYY date format"
EOF
}

die() {
  echo "error: $*" >&2
  exit 1
}

info() {
  echo "==> $*"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bump)
      [[ $# -ge 2 ]] || die "--bump requires patch|minor|major"
      BUMP="$2"
      shift 2
      ;;
    --no-bump)
      BUMP="none"
      shift
      ;;
    --notes)
      [[ $# -ge 2 ]] || die "--notes requires a string"
      NOTES="$2"
      shift 2
      ;;
    --skip-tests)
      SKIP_TESTS=1
      shift
      ;;
    --no-open)
      SKIP_OPEN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown option: $1 (try --help)"
      ;;
  esac
done

case "$BUMP" in
  patch|minor|major|none) ;;
  *) die "--bump must be patch, minor, or major (got: $BUMP)" ;;
esac

command -v pebble >/dev/null 2>&1 || die "pebble CLI not found in PATH"
command -v npm >/dev/null 2>&1 || die "npm not found in PATH"
command -v node >/dev/null 2>&1 || die "node not found in PATH"
[[ -f "$ROOT/package.json" ]] || die "package.json not found in $ROOT"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "warning: working tree is dirty; continue anyway" >&2
  fi
fi

read_pkg_field() {
  local field="$1"
  node -e "const p=require('./package.json'); const v=p${field}; if(v==null||v==='') process.exit(2); process.stdout.write(String(v));"
}

bump_version() {
  local kind="$1"
  node <<EOF
const fs = require("fs");
const path = "package.json";
const pkg = JSON.parse(fs.readFileSync(path, "utf8"));
const parts = String(pkg.version || "0.0.0").split(".").map((n) => parseInt(n, 10) || 0);
while (parts.length < 3) parts.push(0);
if ("$kind" === "major") {
  parts[0] += 1;
  parts[1] = 0;
  parts[2] = 0;
} else if ("$kind" === "minor") {
  parts[1] += 1;
  parts[2] = 0;
} else {
  parts[2] += 1;
}
pkg.version = parts.join(".");
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
process.stdout.write(pkg.version);
EOF
}

copy_to_clipboard() {
  local text="$1"
  if command -v wl-copy >/dev/null 2>&1; then
    printf '%s' "$text" | wl-copy && return 0
  fi
  if command -v xclip >/dev/null 2>&1; then
    printf '%s' "$text" | xclip -selection clipboard && return 0
  fi
  if command -v xsel >/dev/null 2>&1; then
    printf '%s' "$text" | xsel --clipboard --input && return 0
  fi
  return 1
}

open_url() {
  local url="$1"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
    return 0
  fi
  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
    return 0
  fi
  return 1
}

VERSION="$(read_pkg_field '.version')"
UUID="$(read_pkg_field '.pebble.uuid')"
DISPLAY_NAME="$(read_pkg_field '.pebble.displayName')"

if [[ "$BUMP" != "none" ]]; then
  info "Bumping version ($BUMP): $VERSION -> ..."
  VERSION="$(bump_version "$BUMP")"
  info "New version: $VERSION"
else
  info "Keeping version: $VERSION"
fi

if [[ "$SKIP_TESTS" -eq 0 ]]; then
  info "Running tests"
  npm test
else
  info "Skipping tests"
fi

info "Building with pebble"
pebble build

[[ -f "$PBW_PATH" ]] || die "expected PBW missing: $PBW_PATH"

CLIP_OK=0
if copy_to_clipboard "$PBW_PATH"; then
  CLIP_OK=1
fi

OPEN_OK=0
if [[ "$SKIP_OPEN" -eq 0 ]]; then
  info "Opening RePebble developer dashboard"
  if open_url "$PORTAL_URL"; then
    OPEN_OK=1
  else
    echo "warning: could not open a browser; open $PORTAL_URL manually" >&2
  fi
fi

cat <<EOF

------------------------------------------------------------
Rebble release ready
------------------------------------------------------------
App:          $DISPLAY_NAME
Version:      $VERSION
UUID:         $UUID
PBW:          $PBW_PATH
Portal:       $PORTAL_URL
Release notes:
${NOTES:-"(none — paste notes in the portal form)"}
------------------------------------------------------------
Next steps (manual — no public upload API):
  1. Sign in at $PORTAL_URL (Google / GitHub / Apple)
  2. Open your app listing and create a new release
  3. Attach the .pbw above (path $([ "$CLIP_OK" -eq 1 ] && echo "copied to clipboard" || echo "shown above"))
  4. Paste release notes and publish
------------------------------------------------------------
EOF

if [[ "$OPEN_OK" -eq 0 && "$SKIP_OPEN" -eq 0 ]]; then
  exit 0
fi
