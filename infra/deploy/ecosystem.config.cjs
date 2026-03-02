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
  ],
};
