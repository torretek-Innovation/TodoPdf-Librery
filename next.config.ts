import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Configuración para react-pdf
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // Copiar archivos worker de pdfjs
    if (!isServer) {
      config.output.publicPath = config.output.publicPath || '/_next/';
    }

    return config;
  },
};

export default nextConfig;


