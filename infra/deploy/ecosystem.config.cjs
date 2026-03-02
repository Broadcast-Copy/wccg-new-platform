// PM2 Ecosystem Config — WCCG Platform
// Run: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: "wccg-api",
      cwd: "/var/www/wccg-new-platform/apps/api",
      script: "dist/main.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      env_file: "/var/www/wccg-new-platform/apps/api/.env",
      max_memory_restart: "512M",
      error_file: "/var/log/pm2/wccg-api-error.log",
      out_file: "/var/log/pm2/wccg-api-out.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "wccg-admin",
      cwd: "/var/www/wccg-new-platform/apps/admin",
      script: "node_modules/.bin/next",
      args: "start --port 3002",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
      env_file: "/var/www/wccg-new-platform/apps/admin/.env.local",
      max_memory_restart: "512M",
      error_file: "/var/log/pm2/wccg-admin-error.log",
      out_file: "/var/log/pm2/wccg-admin-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
