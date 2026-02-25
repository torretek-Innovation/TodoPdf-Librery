import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  webpack: (config, { isServer }) => {

    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;


    if (!isServer) {
      config.output.publicPath = config.output.publicPath || '/_next/';
    }

    return config;
  },
};

export default nextConfig;


