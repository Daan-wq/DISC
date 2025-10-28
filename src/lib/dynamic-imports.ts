/**
 * Dynamic Imports & Code Splitting
 * 
 * These utilities enable code splitting and lazy loading:
 * - Split large components into separate bundles
 * - Load only when needed
 * - Reduces initial JavaScript size
 * 
 * For this project:
 * - Admin dashboard: Only loaded when admin logs in
 * - Results page: Only loaded when viewing results
 * - PDF generation: Only loaded when needed
 */

'use client'

import dynamic from 'next/dynamic'
import React from 'react'

// Loading component shown while chunk is loading
const LoadingFallback = () => React.createElement(
  'div',
  { className: 'flex items-center justify-center p-8' },
  React.createElement('div', { className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600' })
)

/**
 * Admin Dashboard - Only loaded when admin accesses /admin
 * Reduces initial bundle by ~50kb
 */
export const AdminDashboard = dynamic(
  () => import('@/app/admin/(protected)/page').then(mod => mod.default),
  {
    loading: LoadingFallback,
    ssr: false, // Don't render on server (admin only)
  }
)

/**
 * Results Page - Only loaded when viewing results
 * Reduces initial bundle by ~30kb
 */
export const ResultsPage = dynamic(
  () => import('@/app/admin/(protected)/results/page').then(mod => mod.default),
  {
    loading: LoadingFallback,
    ssr: false,
  }
)

/**
 * Candidates Page - Only loaded when viewing candidates
 * Reduces initial bundle by ~20kb
 */
export const CandidatesPage = dynamic(
  () => import('@/app/admin/(protected)/candidates/page').then(mod => mod.default),
  {
    loading: LoadingFallback,
    ssr: false,
  }
)

/**
 * PDF Generator - Only loaded when generating PDFs
 * Reduces initial bundle by ~100kb (Puppeteer/PDF libs)
 */
export const PDFGenerator = dynamic(
  () => import('@/lib/services/pdf-generator').then(mod => mod.generatePDFFromTemplate),
  {
    loading: LoadingFallback,
    ssr: false,
  }
)

// Note: Add more dynamic imports as needed for other heavy components
