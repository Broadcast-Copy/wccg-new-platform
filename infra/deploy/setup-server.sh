#!/bin/bash
# ============================================================
# WCCG Platform — cPanel VPS Server Setup (KnownHost)
# ============================================================
# Run as the cPanel user (NOT root):  bash setup-server.sh
# ============================================================

set -euo pipefail

echo "=== WCCG Platform Server Setup (cPanel / Apache) ==="
echo ""

# ── 1. Install NVM ──
echo "[1/5] Installing NVM..."
if [ ! -d "$HOME/.nvm" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi

# Source NVM so it's available in this script
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "NVM: $(nvm -v)"

# ── 2. Install Node.js 20 LTS ──
echo "[2/5] Installing Node.js 20 LTS via NVM..."
nvm install 20
nvm alias default 20
nvm use 20
echo "Node: $(node -v)"
echo "npm: $(npm -v)"

# ── 3. Install pnpm ──
echo "[3/5] Installing pnpm..."
if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm
fi
echo "pnpm: $(pnpm -v)"

# ── 4. Install PM2 ──
echo "[4/5] Installing PM2..."
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi
echo "PM2: $(pm2 -v)"

# ── 5. Create app directory and log dirs ──
echo "[5/5] Creating directories..."
mkdir -p ~/wccg-new-platform
mkdir -p ~/logs/pm2

# ── PM2 startup (crontab-based for non-root) ──
echo "Setting up PM2 startup via crontab..."
pm2 startup | tail -1 | bash 2>/dev/null || true

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Clone the repo:"
echo "     cd ~/ && git clone https://github.com/Broadcast-Copy/wccg-new-platform.git"
echo ""
echo "  2. Create env files:"
echo "     nano ~/wccg-new-platform/apps/api/.env"
echo "     nano ~/wccg-new-platform/apps/admin/.env.local"
echo "     (See infra/deploy/env-api.example and env-admin.example for templates)"
echo ""
echo "  3. Run the deploy script:"
echo "     cd ~/wccg-new-platform && bash infra/deploy/deploy.sh"
echo ""
echo "  4. Ask KnownHost support to:"
echo "     - Enable Apache modules: mod_proxy, mod_proxy_http, mod_proxy_wstunnel, mod_headers"
echo "     - Add the VirtualHost configs from infra/deploy/apache-admin.conf and apache-api.conf"
echo "     - Setup AutoSSL for admin.wccg1045.com and api.wccg1045fm.com"
echo ""
