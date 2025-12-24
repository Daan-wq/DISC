/**
 * Report PDF Generation Module
 * 
 * Node-only PDF generation for DISC reports.
 * No Chromium/Puppeteer dependencies - runs on Vercel serverless.
 */

export { generateReportPdf, hasAssetsForProfile, clearAssetCache } from './generate-report-pdf'
export type { DISCData, GenerateReportOptions } from './generate-report-pdf'
