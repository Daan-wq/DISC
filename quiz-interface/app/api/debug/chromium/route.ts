import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

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
    env: string | undefined
    region: string | undefined
    isVercel: boolean
  }
  chromium: {
    executablePath: string | null
    executableExists: boolean
    error: string | null
  }
  sharedLibs: {
    libnss3: { found: boolean; path: string | null }
    libnspr4: { found: boolean; path: string | null }
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

function checkSharedLib(libName: string): { found: boolean; path: string | null } {
  const commonPaths = [
    `/usr/lib/${libName}`,
    `/usr/lib/x86_64-linux-gnu/${libName}`,
    `/lib/x86_64-linux-gnu/${libName}`,
    `/usr/lib64/${libName}`,
    `/lib64/${libName}`,
    `/opt/lib/${libName}`,
  ]
  
  for (const libPath of commonPaths) {
    try {
      if (fs.existsSync(libPath)) {
        return { found: true, path: libPath }
      }
    } catch {
      // Ignore access errors
    }
  }
  return { found: false, path: null }
}

export async function GET(req: NextRequest) {
  const result: DiagnosticResult = {
    timestamp: new Date().toISOString(),
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    vercel: {
      env: process.env.VERCEL_ENV,
      region: process.env.VERCEL_REGION,
      isVercel: !!process.env.VERCEL,
    },
    chromium: {
      executablePath: null,
      executableExists: false,
      error: null,
    },
    sharedLibs: {
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
  try {
    const puppeteer = await import('puppeteer-core')
    
    // Try local chromium first
    if (result.chromium.executablePath && result.chromium.executableExists) {
      try {
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
          }
        }
      }
    } else if (process.env.BROWSERLESS_WS_URL) {
      // No local chromium, try browserless
      try {
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
      }
    } else {
      result.launchTest.error = 'No chromium executable found and no BROWSERLESS_WS_URL configured'
    }
  } catch (e: any) {
    result.launchTest.error = `Import/setup error: ${e?.message}`
    result.launchTest.durationMs = Date.now() - startTime
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
