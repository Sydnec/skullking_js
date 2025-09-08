import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // Nécessaire pour Docker
};

export default nextConfig;
