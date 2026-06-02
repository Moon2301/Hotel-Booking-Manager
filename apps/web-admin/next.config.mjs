/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone only for production builds — breaks dev chunk serving in Docker if always on
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/room-rates',
        destination: '/rates',
      },
      {
        source: '/services',
        destination: '/service-catalog',
      },
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_INTERNAL_URL || 'http://localhost:3000'}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
