/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      '@remotion/bundler',
      '@remotion/renderer',
      'msedge-tts',
      'ws',
      'bufferutil',
      'utf-8-validate'
    ],
  },
};

module.exports = nextConfig;
