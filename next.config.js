/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable the app directory
    appDir: true,
  },
  images: {
    domains: ['images.unsplash.com'],
  },
}

module.exports = nextConfig