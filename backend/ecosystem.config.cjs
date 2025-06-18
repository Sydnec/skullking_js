// Version CommonJS pour compatibilité PM2
module.exports = {
  apps: [{
    name: 'skullking-backend',
    script: './server.js',
    cwd: '/home/sydnec/skullking_js/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      SSL_CERT_PATH: '/etc/ssl/certs/your-cert.crt',
      SSL_KEY_PATH: '/etc/ssl/private/your-key.key',
      SSL_CA_PATH: '/etc/ssl/certs/ca-bundle.crt',
      FORCE_HTTPS: 'true',
      ALLOWED_ORIGINS: 'https://skullking-pcr.vercel.app'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
