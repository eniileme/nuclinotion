import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['unzipper'],
  // For App Router API routes, we handle size limits in the route handlers
};

export default nextConfig;
