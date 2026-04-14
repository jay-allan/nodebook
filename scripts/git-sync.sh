#!/bin/sh
# git-sync sidecar script
#
# Clones your private fork on first run, then polls for changes every
# $SYNC_INTERVAL seconds, copying articles/ and templates/ into the shared
# content volume. The nodebook container reads from that volume, so updates
# appear automatically on the next HTTP request after each sync cycle.
#
# Required environment variables:
#   GIT_REPO         SSH URL of your private fork
#                    e.g. git@github.com:your-username/your-nodebook-fork.git
#
# Optional environment variables (with defaults):
#   GIT_BRANCH       Branch to track (default: main)
#   SYNC_INTERVAL    Seconds between syncs (default: 60)
#
# The SSH deploy key must be mounted at /root/.ssh/deploy_key (read-only).
# See README.md for instructions on generating and configuring a deploy key.

set -e

if [ -z "$GIT_REPO" ]; then
    echo "[git-sync] ERROR: GIT_REPO is not set. Exiting."
    exit 1
fi

GIT_BRANCH="${GIT_BRANCH:-main}"
SYNC_INTERVAL="${SYNC_INTERVAL:-60}"
REPO_DIR="/repo"
CONTENT_TARGET="/content"

echo "[git-sync] Repo: $GIT_REPO | Branch: $GIT_BRANCH | Interval: ${SYNC_INTERVAL}s"

# ── SSH setup ─────────────────────────────────────────────────────────────────
# The deploy key is mounted :ro so we copy it locally to apply chmod 600,
# which SSH requires.
mkdir -p /root/.ssh
cp /root/.ssh/deploy_key /root/.ssh/id_ed25519
chmod 600 /root/.ssh/id_ed25519

cat > /root/.ssh/config <<EOF
Host github.com
    IdentityFile /root/.ssh/id_ed25519
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
EOF

# ── Initial clone ─────────────────────────────────────────────────────────────
# The git_repo_cache volume persists the clone across container restarts, so
# subsequent startups only need a fetch rather than a full re-clone.
if [ ! -d "$REPO_DIR/.git" ]; then
    echo "[git-sync] Cloning $GIT_REPO (branch: $GIT_BRANCH)..."
    git clone --branch "$GIT_BRANCH" --depth 1 "$GIT_REPO" "$REPO_DIR"
    echo "[git-sync] Clone complete."
else
    echo "[git-sync] Existing clone found at $REPO_DIR — skipping initial clone."
fi

# ── Content sync function ─────────────────────────────────────────────────────
sync_content() {
    COMMIT=$(git -C "$REPO_DIR" rev-parse --short HEAD)
    SYNCED=""

    if [ -d "$REPO_DIR/articles" ]; then
        mkdir -p "$CONTENT_TARGET/articles"
        cp -r "$REPO_DIR/articles/." "$CONTENT_TARGET/articles/"
        SYNCED="${SYNCED} articles/"
    fi

    if [ -d "$REPO_DIR/templates" ]; then
        mkdir -p "$CONTENT_TARGET/templates"
        cp -r "$REPO_DIR/templates/." "$CONTENT_TARGET/templates/"
        SYNCED="${SYNCED} templates/"
    fi

    if [ -n "$SYNCED" ]; then
        echo "[git-sync] $(date): Synced${SYNCED}@ $COMMIT"
    else
        echo "[git-sync] WARNING: Neither articles/ nor templates/ found in repo."
    fi
}

sync_content

# ── Perpetual sync loop ───────────────────────────────────────────────────────
while true; do
    sleep "$SYNC_INTERVAL"
    git -C "$REPO_DIR" fetch origin "$GIT_BRANCH"
    git -C "$REPO_DIR" reset --hard "origin/$GIT_BRANCH"
    sync_content
done
