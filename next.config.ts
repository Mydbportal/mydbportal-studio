import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost", "::1"],
  eslint: {
    ignoreDuringBuilds: true, // to be removed in future
  },
  images: { unoptimized: true },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
