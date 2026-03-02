#!/bin/bash
# ============================================================
# WCCG Platform — Deploy Script (cPanel / NVM)
# ============================================================
# Run from repo root: bash infra/deploy/deploy.sh
# Re-run anytime to pull latest code and redeploy.
# ============================================================

set -euo pipefail

# Source NVM so node/pnpm/pm2 are in PATH
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

APP_DIR="$HOME/wccg-new-platform"
cd "$APP_DIR"

echo "=== WCCG Deploy ==="
echo ""

# ── 1. Pull latest code ──
echo "[1/5] Pulling latest code..."
git pull origin main

# ── 2. Install dependencies ──
echo "[2/5] Installing dependencies..."
pnpm install --frozen-lockfile

# ── 3. Build API ──
echo "[3/5] Building API..."
pnpm --filter api build

# ── 4. Build Admin ──
echo "[4/5] Building Admin..."
pnpm --filter admin build

# ── 5. Restart services ──
echo "[5/5] Restarting services with PM2..."
pm2 startOrRestart infra/deploy/ecosystem.config.cjs --env production
pm2 save

echo ""
echo "=== Deploy Complete ==="
echo ""
echo "Services:"
pm2 list
echo ""
echo "Admin:  https://admin.wccg1045.com"
echo "API:    https://api.wccg1045fm.com"
echo ""
echo "Check logs:"
echo "  pm2 logs wccg-api"
echo "  pm2 logs wccg-admin"
echo ""
