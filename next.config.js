/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@repo/ui", "@betfun/sdk"],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  images: {
    domains: [
      'arweave.net',
      'ipfs.io',
      'gateway.pinata.cloud',
      'nftstorage.link',
      'betfun.arena',
      'indie.fun',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.arweave.net',
      },
      {
        protocol: 'https',
        hostname: '**.ipfs.io',
      },
    ],
  },
};

module.exports = nextConfig;

