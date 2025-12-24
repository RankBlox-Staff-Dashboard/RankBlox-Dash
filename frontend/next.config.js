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
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://ahsback.zenohost.co.uk/api'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

