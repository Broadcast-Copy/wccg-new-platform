// PM2 Ecosystem Config — WCCG Platform (cPanel / NVM)
// Run: pm2 start ecosystem.config.cjs

const path = require("path");
const home = process.env.HOME || process.env.USERPROFILE;
const appRoot = path.join(home, "wccg-new-platform");

module.exports = {
  apps: [
    {
      name: "wccg-api",
      cwd: path.join(appRoot, "apps/api"),
      script: "dist/main.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      env_file: path.join(appRoot, "apps/api/.env"),
      max_memory_restart: "512M",
      error_file: path.join(home, "logs/pm2/wccg-api-error.log"),
      out_file: path.join(home, "logs/pm2/wccg-api-out.log"),
      merge_logs: true,
      time: true,
    },
    {
      name: "wccg-admin",
      cwd: path.join(appRoot, "apps/admin"),
      script: "node_modules/.bin/next",
      args: "start --port 3002",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
      env_file: path.join(appRoot, "apps/admin/.env.local"),
      max_memory_restart: "512M",
      error_file: path.join(home, "logs/pm2/wccg-admin-error.log"),
      out_file: path.join(home, "logs/pm2/wccg-admin-out.log"),
      merge_logs: true,
      time: true,
    },
    {
      // Auto-research agent loop + DJ FTP server.
      // Required env (apps/workers/.env):
      //   SUPABASE_URL, SUPABASE_SECRET_KEY
      //   ANTHROPIC_API_KEY      (optional — agent skips if missing)
      //   FTP_PORT               (default 2121)
      //   FTP_PASV_URL           (REQUIRED if FTP is reachable from outside localhost)
      //   FTP_PASV_RANGE         (default "30000-30009"; open these on firewall)
      //   FTP_TLS_CERT, FTP_TLS_KEY  (optional, recommended for prod)
      //   FTP_DISABLED=true      to skip starting the FTP server
      //   AGENT_DISABLED=true    to skip the auto-research loop
      // See docs/DJ-PORTAL-FTP.md for the full runbook.
      name: "wccg-workers",
      cwd: path.join(appRoot, "apps/workers"),
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      env_file: path.join(appRoot, "apps/workers/.env"),
      max_memory_restart: "768M",
      error_file: path.join(home, "logs/pm2/wccg-workers-error.log"),
      out_file: path.join(home, "logs/pm2/wccg-workers-out.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
