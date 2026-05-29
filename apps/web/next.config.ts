import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow PixiJS + WebGL packages (they use browser APIs only)
  serverExternalPackages: ["pixi.js", "howler"],

  // Silence Turbopack warning by telling Next.js to use Webpack
  turbopack: {},

  webpack(config, { isServer }) {
    // Enable Web Worker support via Webpack 5 asset/resource
    config.module.rules.push({
      test: /\.worker\.(ts|js)$/,
      use: {
        loader: "worker-loader",
        options: {
          filename: "static/[hash].worker.js",
        },
      },
    });

    // Required for PixiJS — it references canvas/WebGL which don't exist server-side
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "pixi.js",
        "howler",
        "comlink",
      ];
    }

    // Allow .wasm files (FastNoiseLite WebAssembly variant, if needed)
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    return config;
  },
};

export default nextConfig;
