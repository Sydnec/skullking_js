import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Moved from experimental.serverComponentsExternalPackages
  serverExternalPackages: ['sqlite3'],
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js']
  },
  webpack: (config, { isServer }) => {
    // Ensure proper module resolution
    config.resolve.extensionAlias = {
      '.js': ['.tsx', '.ts', '.jsx', '.js'],
    };
    
    // Optimisation pour SQLite sur Vercel
    if (isServer) {
      config.externals.push('sqlite3');
    }
    
    return config;
  },
  // Configuration pour le déploiement
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  distDir: '.next',
  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
