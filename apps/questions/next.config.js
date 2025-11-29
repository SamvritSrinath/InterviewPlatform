/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@interview-platform/supabase-client',
    '@interview-platform/utils',
  ],
};

module.exports = nextConfig;