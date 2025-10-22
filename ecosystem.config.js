module.exports = {
  apps: [
    {
      name: "public-app-node",
      script: "dist/server.js",
      cwd: "./",
      exec_mode: "fork",     // or "cluster"
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: 3100           // we'll listen on 3100
      },
      error_file: "/var/www/public-app-node/shared/logs/err.log",
      out_file: "/var/www/public-app-node/shared/logs/out.log",
      merge_logs: true
    }
  ]
};
