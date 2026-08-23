import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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