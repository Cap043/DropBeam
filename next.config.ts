import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow your phone/hotspot network to load Next.js assets
  allowedDevOrigins: [
    "10.227.200.54",
    "localhost:3000" // Keep localhost working too
  ],
};

export default nextConfig;