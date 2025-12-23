module.exports = {
  apps: [
    {
      name: 'examServer_PM2',
      script: 'dist/examServer.js',
      watch: false,
      instances: 0,
      exec_mode: 'cluster',
      instance_var: 'INSTANCE_ID',
      increment_var: 'PORT',
      env: {
        // Environment variables for default environment
        NODE_ENV: 'production',
        PORT: 8080,
      },
    },
  ],
};
