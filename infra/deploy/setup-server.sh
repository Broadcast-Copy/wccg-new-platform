#!/bin/bash
# ============================================================
# WCCG Platform — VPS Server Setup (KnownHost / Ubuntu/Debian)
# ============================================================
# Run once on a fresh VPS:  sudo bash setup-server.sh
# ============================================================

set -euo pipefail

echo "=== WCCG Platform Server Setup ==="
echo ""

# ── 1. System updates ──
echo "[1/7] Updating system packages..."
apt update && apt upgrade -y

# ── 2. Install Node.js 20 LTS ──
echo "[2/7] Installing Node.js 20 LTS..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo "Node: $(node -v)"
echo "npm: $(npm -v)"

# ── 3. Install pnpm ──
echo "[3/7] Installing pnpm..."
if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm
fi
echo "pnpm: $(pnpm -v)"

# ── 4. Install PM2 ──
echo "[4/7] Installing PM2..."
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi
echo "PM2: $(pm2 -v)"

# ── 5. Install Nginx ──
echo "[5/7] Installing Nginx..."
if ! command -v nginx &>/dev/null; then
  apt install -y nginx
fi
systemctl enable nginx
systemctl start nginx

# ── 6. Install Certbot (SSL) ──
echo "[6/7] Installing Certbot for SSL..."
if ! command -v certbot &>/dev/null; then
  apt install -y certbot python3-certbot-nginx
fi

# ── 7. Create app directory and log dirs ──
echo "[7/7] Creating directories..."
mkdir -p /var/www/wccg-new-platform
mkdir -p /var/log/pm2
chown -R $SUDO_USER:$SUDO_USER /var/www/wccg-new-platform
chown -R $SUDO_USER:$SUDO_USER /var/log/pm2

# ── 8. Setup PM2 to start on boot ──
echo "Setting up PM2 startup..."
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Clone the repo:"
echo "     cd /var/www && git clone https://github.com/Broadcast-Copy/wccg-new-platform.git"
echo ""
echo "  2. Create env files:"
echo "     nano /var/www/wccg-new-platform/apps/api/.env"
echo "     nano /var/www/wccg-new-platform/apps/admin/.env.local"
echo ""
echo "  3. Run the deploy script:"
echo "     cd /var/www/wccg-new-platform && bash infra/deploy/deploy.sh"
echo ""
echo "  4. Setup Nginx:"
echo "     cp infra/deploy/nginx-admin.conf /etc/nginx/sites-available/wccg-admin"
echo "     cp infra/deploy/nginx-api.conf /etc/nginx/sites-available/wccg-api"
echo "     ln -s /etc/nginx/sites-available/wccg-admin /etc/nginx/sites-enabled/"
echo "     ln -s /etc/nginx/sites-available/wccg-api /etc/nginx/sites-enabled/"
echo "     nginx -t && systemctl reload nginx"
echo ""
echo "  5. Get SSL certificates:"
echo "     certbot --nginx -d admin.wccg1045fm.com"
echo "     certbot --nginx -d api.wccg1045fm.com"
echo ""
