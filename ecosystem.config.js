export default {
  apps: [{
    name: 'skullking',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Configuration spécifique pour Raspberry Pi
    node_args: '--max-old-space-size=512',
    // Redémarrage automatique en cas de crash
    min_uptime: '10s',
    max_restarts: 10,
    // Gestion des signaux
    kill_timeout: 5000,
    listen_timeout: 8000
  }]
};
