/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@e2ee-chat/shared', '@e2ee-chat/crypto'],
  reactStrictMode: true,
};

export default nextConfig;
