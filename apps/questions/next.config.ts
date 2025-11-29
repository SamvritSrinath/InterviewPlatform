import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@interview-platform/supabase-client', '@interview-platform/utils'],
};

export default nextConfig;

