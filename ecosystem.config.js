module.exports = {
  apps: [
    {
      name: 'sikcheong',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 8228',
      cwd: '/srv/net/mystwiz/sikcheong',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8228,
      },
      error_file: '/srv/net/mystwiz/sikcheong/logs/error.log',
      out_file: '/srv/net/mystwiz/sikcheong/logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
