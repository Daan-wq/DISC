'use client'

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { getTemplateBasePath, isValidProfileCode } from '@/lib/report/template-registry'

const PUBLICATION_FILES = [
  'publication.html',
  'publication-1.html',
  'publication-2.html',
  'publication-3.html',
  'publication-4.html',
  'publication-5.html',
  'publication-6.html',
  'publication-7.html',
  'publication-8.html',
] as const

function isInIframe(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

function injectIframeRenderOverrides(doc: Document): void {
  const existing = doc.querySelector('style[data-disc-iframe-overrides="true"]')
  if (existing) return

  const style = doc.createElement('style')
  style.setAttribute('data-disc-iframe-overrides', 'true')
  style.textContent = `
html,
body {
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

html,
body {
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
}
html::-webkit-scrollbar,
body::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}

@media print {
  html,
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
}
`

  const head = doc.head || doc.getElementsByTagName('head')[0]
  if (head) {
    head.appendChild(style)
  } else {
    doc.documentElement.appendChild(style)
  }
}

 function sleep(ms: number): Promise<void> {
   return new Promise((resolve) => window.setTimeout(resolve, ms))
 }

async function injectReportPrintCss(): Promise<void> {
  const existing = document.querySelector('link[data-report-print="true"]') as HTMLLinkElement | null
  if (existing) {
    return
  }

  await new Promise<void>((resolve) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/report-print.css?v=2'
    link.setAttribute('data-report-print', 'true')

    link.onload = () => resolve()
    link.onerror = () => resolve()

    document.head.appendChild(link)
  })
}

async function waitForImages(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images || [])

  await Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve()
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true })
        img.addEventListener('error', () => resolve(), { once: true })
      })
    })
  )
}

function toAbsoluteUrl(url: string): string {
  try {
    return new URL(url, window.location.href).href
  } catch {
    return url
  }
}

async function waitForIframeNavigationComplete(iframe: HTMLIFrameElement): Promise<void> {
  const target = toAbsoluteUrl(iframe.src)

  for (let i = 0; i < 600; i++) {
    const win = iframe.contentWindow
    const doc = iframe.contentDocument

    if (win && doc) {
      try {
        const current = toAbsoluteUrl(win.location.href)
        if (current === target && doc.readyState === 'complete') {
          return
        }
      } catch {
        // Ignore - can happen during navigation
      }
    }

    await sleep(50)
  }

  throw new Error('Timeout: iframe pagina kon niet volledig laden')
}

async function waitForIframeReady(iframe: HTMLIFrameElement): Promise<void> {
  await waitForIframeNavigationComplete(iframe)

  const doc = iframe.contentDocument
  if (!doc) {
    throw new Error('Iframe document niet beschikbaar')
  }

  injectIframeRenderOverrides(doc)

  try {
    if ((doc as any).fonts?.ready) {
      await (doc as any).fonts.ready
    }
  } catch {
  }

  await waitForImages(doc)
}

function buildPublicationUrls(token: string): string[] {
  return PUBLICATION_FILES.map((file) => {
    return `/api/rapport/render-publication?token=${encodeURIComponent(token)}&file=${encodeURIComponent(file)}`
  })
}

function PrintHtmlContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileCode, setProfileCode] = useState<string | null>(null)
  const [templateBasePath, setTemplateBasePath] = useState<string | null>(null)

  const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([])

  const publicationUrls = useMemo(() => {
    if (!token) return []
    return buildPublicationUrls(token)
  }, [token])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!token) {
        setError('Geen geldig token opgegeven')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        await injectReportPrintCss()

        const response = await fetch(`/api/rapport/get-data?token=${token}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({} as any))
          const msg = (errorData as any)?.error || `Kon rapport niet laden (${response.status})`
          throw new Error(msg)
        }

        const data = await response.json()
        const code = typeof data?.profileCode === 'string' ? data.profileCode.toUpperCase() : ''

        if (!code || !isValidProfileCode(code)) {
          throw new Error(`Ongeldige profielcode: ${data?.profileCode}`)
        }

        const base = getTemplateBasePath(code)
        if (!base) {
          throw new Error(`Template niet gevonden voor profielcode: ${code}`)
        }

        if (cancelled) return

        setProfileCode(code)
        setTemplateBasePath(base)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Onbekende fout'
        setError(msg)

        try {
          window.parent?.postMessage(
            {
              type: 'disc_report_error',
              token,
              message: msg,
            },
            window.location.origin
          )
        } catch {
        }
      } finally {
        setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    let cancelled = false

    const prepare = async () => {
      if (!token || !templateBasePath) return

      try {
        const waitForIframesMounted = async (): Promise<HTMLIFrameElement[]> => {
          for (let i = 0; i < 300; i++) {
            if (cancelled) {
              throw new Error('Print voorbereiding geannuleerd')
            }

            const iframesNow = iframeRefs.current.filter(Boolean) as HTMLIFrameElement[]
            if (iframesNow.length === PUBLICATION_FILES.length) {
              return iframesNow
            }

            await sleep(50)
          }

          throw new Error('Timeout: niet alle rapportpagina\'s konden geladen worden')
        }

        const iframes = await waitForIframesMounted()

        await Promise.all(iframes.map((iframe) => waitForIframeReady(iframe)))

        if (cancelled) return

        try {
          window.parent?.postMessage(
            {
              type: 'disc_report_ready',
              token,
            },
            window.location.origin
          )
        } catch {
        }

        // If opened directly (not in hidden iframe), trigger print once.
        if (!isInIframe()) {
          const printedKey = `print_done_html_${token}`
          const alreadyPrinted = !!window.sessionStorage.getItem(printedKey)
          if (!alreadyPrinted) {
            window.sessionStorage.setItem(printedKey, new Date().toISOString())
            window.setTimeout(() => {
              window.print()
            }, 250)
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Onbekende fout'
        setError(msg)

        try {
          window.parent?.postMessage(
            {
              type: 'disc_report_error',
              token,
              message: msg,
            },
            window.location.origin
          )
        } catch {
        }
      }
    }

    prepare()

    return () => {
      cancelled = true
    }
  }, [token, templateBasePath])

  if (loading) {
    return <LoadingState />
  }

  if (error || !profileCode || !templateBasePath) {
    return <ErrorState message={error || undefined} />
  }

  return (
    <div>
      {publicationUrls.map((url, idx) => (
        <div className="report-page" key={url}>
          <iframe
            ref={(el) => {
              iframeRefs.current[idx] = el
            }}
            className="report-iframe"
            src={url}
            scrolling="no"
            style={{ overflow: 'hidden' }}
            title={`Report page ${idx + 1}`}
          />
        </div>
      ))}
    </div>
  )
}

export default function PrintHtmlPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PrintHtmlContent />
    </Suspense>
  )
}
