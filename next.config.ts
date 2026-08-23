import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete
    // even if your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: [
    "10.227.200.54",
    "localhost:3000"
  ],
  // 🌟 This forces browser/client console.logs to show up in your terminal!
  logging: {
    browserToTerminal: true,
  },
};

export default nextConfig;