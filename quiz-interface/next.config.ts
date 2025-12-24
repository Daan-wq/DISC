import type { NextConfig } from "next";

// Environment-specific CSP
const isDev = process.env.NODE_ENV === 'development'

// Development: Permissive CSP (allows unsafe-inline/eval for dev tools)
const devCSP = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https://vercel.live; connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com https://vercel.live https://*.tlcprofielen.nl; frame-src https://challenges.cloudflare.com https://vercel.live; object-src 'none'; base-uri 'self'; form-action 'self';"

// Production: CSP with unsafe-inline for Next.js and vercel.live for Vercel toolbar
const prodCSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://vercel.live; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https://vercel.live; connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com https://vercel.live https://*.tlcprofielen.nl; frame-src https://challenges.cloudflare.com https://vercel.live; object-src 'none'; base-uri 'self'; form-action 'self';"

const nextConfig: NextConfig = {
  // PDF rendering support
  serverExternalPackages: ['@react-pdf/renderer', '@resvg/resvg-js'],
  
  // Turbopack and Webpack configuration
  turbopack: {},
  webpack: (config, { isServer }) => {
    config.resolve.alias.canvas = false
    config.resolve.alias.encoding = false
    
    // Suppress webpack cache warning for big strings
    config.infrastructureLogging = {
      level: 'error',
    }
    
    return config
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // CSP: Restrict where scripts/styles can come from (environment-specific)
          {
            key: 'Content-Security-Policy',
            value: isDev ? devCSP : prodCSP,
          },
          // HSTS: Force HTTPS for 1 year
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Control browser features
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=()',
          },
          // XSS protection (legacy, but good for old browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },

  // HTTP caching for static assets
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;
