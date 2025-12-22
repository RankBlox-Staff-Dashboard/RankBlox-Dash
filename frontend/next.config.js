/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    VITE_API_URL: process.env.VITE_API_URL,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.VITE_API_URL || 'https://staffapp-9q1t.onrender.com/api'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

