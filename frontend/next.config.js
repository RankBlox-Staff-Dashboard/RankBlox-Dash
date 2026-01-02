/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
      {
        // Roblox avatar CDN - images are served from various tr*.rbxcdn.com subdomains
        protocol: 'https',
        hostname: '*.rbxcdn.com',
      },
      {
        // Alternative Roblox CDN hostname
        protocol: 'https',
        hostname: 'tr.rbxcdn.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://rankblox-dash-backend-706270663868.europe-west1.run.app/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

