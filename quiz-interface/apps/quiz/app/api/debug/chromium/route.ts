/**
 * /api/debug/chromium - Chromium diagnostics endpoint
 * 
 * Router root: apps/quiz/app/api (NOT root app/api)
 * This is because package.json build script uses: pnpm --filter=quiz run build
 * 
 * Purpose: Diagnose Chromium launch issues on Vercel
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface DiagnosticResult {
  timestamp: string
  node: {
    version: string
    platform: string
    arch: string
  }
  vercel: {
    env: string | null
    region: string | null
    isVercel: boolean
  }
  chromium: {
    executablePath: string | null
    executableExists: boolean
    error: string | null
  }
  libs: {
    libnss3: { found: boolean; paths: string[] }
    libnspr4: { found: boolean; paths: string[] }
  }
  browserlessConfigured: boolean
  launchTest: {
    success: boolean
    strategy: 'local' | 'browserless' | 'none'
    durationMs: number
    error: string | null
    browserVersion: string | null
  }
}

function checkSharedLib(libName: string): { found: boolean; paths: string[] } {
  const searchPaths = [
    `/usr/lib/${libName}`,
    `/usr/lib64/${libName}`,
    `/usr/lib/x86_64-linux-gnu/${libName}`,
    `/lib/${libName}`,
    `/lib64/${libName}`,
    `/lib/x86_64-linux-gnu/${libName}`,
  ]
  
  const foundPaths: string[] = []
  for (const libPath of searchPaths) {
    try {
      if (fs.existsSync(libPath)) {
        foundPaths.push(libPath)
      }
    } catch {
      // Ignore access errors
    }
  }
  return { found: foundPaths.length > 0, paths: foundPaths }
}

export async function GET(req: NextRequest) {
  console.log('[debug/chromium] Request received')
  
  const result: DiagnosticResult = {
    timestamp: new Date().toISOString(),
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    vercel: {
      env: process.env.VERCEL_ENV || null,
      region: process.env.VERCEL_REGION || null,
      isVercel: !!process.env.VERCEL,
    },
    chromium: {
      executablePath: null,
      executableExists: false,
      error: null,
    },
    libs: {
      libnss3: checkSharedLib('libnss3.so'),
      libnspr4: checkSharedLib('libnspr4.so'),
    },
    browserlessConfigured: !!process.env.BROWSERLESS_WS_URL,
    launchTest: {
      success: false,
      strategy: 'none',
      durationMs: 0,
      error: null,
      browserVersion: null,
    },
  }

  // Get chromium executable path
  try {
    const chromium = await import('@sparticuz/chromium')
    const execPath = await chromium.default.executablePath()
    result.chromium.executablePath = execPath
    result.chromium.executableExists = fs.existsSync(execPath)
  } catch (e: any) {
    result.chromium.error = e?.message || String(e)
  }

  // Try to launch browser
  const startTime = Date.now()
  
  if (result.chromium.executablePath && result.chromium.executableExists) {
    try {
      const puppeteer = await import('puppeteer-core')
      const chromium = await import('@sparticuz/chromium')
      
      const browser = await puppeteer.default.launch({
        args: [
          ...chromium.default.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
        ],
        defaultViewport: chromium.default.defaultViewport,
        executablePath: result.chromium.executablePath,
        headless: chromium.default.headless,
        timeout: 10000,
      })
      
      result.launchTest.browserVersion = await browser.version()
      await browser.close()
      
      result.launchTest.success = true
      result.launchTest.strategy = 'local'
      result.launchTest.durationMs = Date.now() - startTime
    } catch (localError: any) {
      result.launchTest.error = `Local launch failed: ${localError?.message}`
      
      // Try browserless fallback if configured
      if (process.env.BROWSERLESS_WS_URL) {
        try {
          const puppeteer = await import('puppeteer-core')
          const browser = await puppeteer.default.connect({
            browserWSEndpoint: process.env.BROWSERLESS_WS_URL,
          })
          
          result.launchTest.browserVersion = await browser.version()
          await browser.close()
          
          result.launchTest.success = true
          result.launchTest.strategy = 'browserless'
          result.launchTest.durationMs = Date.now() - startTime
          result.launchTest.error = `Local failed, browserless succeeded. Local error: ${localError?.message}`
        } catch (browserlessError: any) {
          result.launchTest.error = `Both failed. Local: ${localError?.message}. Browserless: ${browserlessError?.message}`
          result.launchTest.durationMs = Date.now() - startTime
        }
      }
    }
  } else if (process.env.BROWSERLESS_WS_URL) {
    // No local chromium, try browserless
    try {
      const puppeteer = await import('puppeteer-core')
      const browser = await puppeteer.default.connect({
        browserWSEndpoint: process.env.BROWSERLESS_WS_URL,
      })
      
      result.launchTest.browserVersion = await browser.version()
      await browser.close()
      
      result.launchTest.success = true
      result.launchTest.strategy = 'browserless'
      result.launchTest.durationMs = Date.now() - startTime
    } catch (browserlessError: any) {
      result.launchTest.error = `Browserless failed: ${browserlessError?.message}`
      result.launchTest.durationMs = Date.now() - startTime
    }
  } else {
    result.launchTest.error = 'No chromium executable found and no BROWSERLESS_WS_URL configured'
    result.launchTest.durationMs = Date.now() - startTime
  }

  console.log('[debug/chromium] Result:', JSON.stringify(result, null, 2))

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
