module.exports = {
  apps: [{
    name: 'skull-king',
    script: 'server.js',
    cwd: '/home/pi/skullking',
    instances: 1,
    exec_mode: 'cluster',
    
    // Variables d'environnement
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: 'file:./prisma/db/dev.db'
    },
    
    // Production
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'file:./prisma/db/production.db'
    },
    
    // Options de redémarrage
    watch: false,
    ignore_watch: [
      'node_modules',
      '.next',
      'logs',
      'prisma/db'
    ],
    
    // Gestion des erreurs
    max_restarts: 10,
    min_uptime: '5s',
    restart_delay: 1000,
    
    // Logs
    log_file: '/home/pi/logs/skull-king-combined.log',
    out_file: '/home/pi/logs/skull-king-out.log',
    error_file: '/home/pi/logs/skull-king-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Monitoring
    max_memory_restart: '500M',
    
    // Cluster settings
    listen_timeout: 10000,
    kill_timeout: 5000,
    
    // Health check
    health_check: {
      enable: true,
      url: 'http://localhost:3000/api/health',
      interval: 30000,
      max_retry: 3,
      retry_delay: 5000
    }
  }]
};
