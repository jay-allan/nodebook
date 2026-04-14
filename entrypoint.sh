#!/bin/sh
set -e

CONTENT_DIR="/app/content"

# Seed default templates into the content volume if not already present.
# This allows the container to serve pages on first run without any external
# content source. If a git-sync sidecar is running, it will overwrite these
# with the user's customised templates on its first sync cycle.
if [ ! -d "$CONTENT_DIR/templates" ]; then
    echo "[nodebook] Seeding default templates into content volume..."
    mkdir -p "$CONTENT_DIR/templates"
    cp -r /app/defaults/templates/. "$CONTENT_DIR/templates/"
fi

# Ensure the articles directory exists (may be empty until content is added
# or git-sync populates it — nodebook will simply show an empty index).
mkdir -p "$CONTENT_DIR/articles"

exec node dist/app.js "$@"
