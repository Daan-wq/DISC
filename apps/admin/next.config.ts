import type { NextConfig } from "next";
import path from 'path'
import { config as dotenvConfig } from 'dotenv'

const isDev = process.env.NODE_ENV === 'development'
const repoRoot = path.resolve(__dirname, '../..')

dotenvConfig({ path: path.resolve(__dirname, '../../.env.local') })

const devCSP = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https://vercel.live; connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com https://vercel.live https://*.tlcprofielen.nl; frame-src https://challenges.cloudflare.com https://vercel.live; object-src 'none'; base-uri 'self'; form-action 'self';"

const prodCSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://vercel.live; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https://vercel.live; connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com https://vercel.live https://*.tlcprofielen.nl; frame-src https://challenges.cloudflare.com https://vercel.live; object-src 'none'; base-uri 'self'; form-action 'self';"

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: repoRoot,
  serverExternalPackages: ['@react-pdf/renderer'],
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  webpack: (config, { isServer }) => {
    config.resolve.alias.canvas = false
    config.resolve.alias.encoding = false

    return config
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: isDev ? devCSP : prodCSP,
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;
