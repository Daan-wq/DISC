'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Download, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DiscChartSection } from '../components/DiscChartSection';
import { SummaryCard } from '../components/SummaryCard';
import { HeroSection } from '../components/HeroSection';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { DiscReport } from '../types';
import { getInsightsForProfile } from '../components/data';

type DeliveryConfig = {
  can_user_download: boolean
  send_pdf_user: boolean
  send_pdf_trainer: boolean
  trainer_email: string | null
}

interface TemplateManifest {
  generatedAt: string
  templates: Array<{
    profileCode: string
    sourceFolderName: string
    publicBasePath: string
  }>
}

const LEGACY_PRINT_ENABLED = process.env.NEXT_PUBLIC_REPORT_PRINT_LEGACY === '1';

async function fetchTemplateManifest(): Promise<TemplateManifest> {
  const res = await fetch(`/report-templates/manifest.json?v=${Date.now()}`, {
    cache: 'no-store'
  })

  if (!res.ok) {
    throw new Error(`Kon template manifest niet laden (HTTP ${res.status})`)
  }

  const manifest = await res.json() as TemplateManifest

  if (!manifest.templates || !Array.isArray(manifest.templates)) {
    throw new Error('Ongeldig manifest formaat')
  }

  return manifest
}

function buildTemplateSelectionPrompt(
  manifest: TemplateManifest,
  selectedProfileCode: string
): string {
  const lines = [
    'Beschikbare templates (bron: Disc profielen origineel):',
    '',
  ]

  manifest.templates.forEach((template, index) => {
    const number = index + 1
    const marker = template.profileCode === selectedProfileCode ? ' (GEKOZEN)' : ''
    lines.push(`${number}) ${template.profileCode} - ${template.sourceFolderName}${marker}`)
  })

  lines.push('')
  lines.push(`Automatisch gekozen template voor dit rapport: ${selectedProfileCode}`)
  lines.push('')
  lines.push('Klik OK om door te gaan met printen.')

  return lines.join('\n')
}

 async function printReportInHiddenIframe(
   printUrl: string,
   token: string,
   mode: 'handshake' | 'onload'
 ): Promise<void> {
   await new Promise<void>((resolve, reject) => {
     const iframe = document.createElement('iframe');
     iframe.setAttribute('aria-hidden', 'true');
     iframe.style.position = 'fixed';
     iframe.style.width = '0';
     iframe.style.height = '0';
     iframe.style.border = '0';
     iframe.style.left = '-9999px';
     iframe.style.top = '0';

     console.log('[rapport/print] Creating hidden iframe', { printUrl });

     let resolved = false;
     let timeoutId: number | undefined = undefined;
     let fallbackResolveId: number | undefined;
     const shouldListenForMessages = mode === 'handshake';

     const cleanup = () => {
       if (shouldListenForMessages) {
         window.removeEventListener('message', onMessage);
       }
       if (timeoutId) {
         window.clearTimeout(timeoutId);
       }
       if (fallbackResolveId) {
         window.clearTimeout(fallbackResolveId);
       }
       try {
         iframe.parentNode?.removeChild(iframe);
       } catch {
       }
     };

     const startPrint = () => {
       if (resolved) return;
       try {
         const cw = iframe.contentWindow;
         if (!cw) {
           cleanup();
           reject(new Error(`Kon print context niet openen (url: ${printUrl})`));
           return;
         }

         resolved = true;

        const afterPrintHandler = () => {
          try {
            cw.removeEventListener('afterprint', afterPrintHandler);
          } catch {
          }
          cleanup();
          resolve();
        };

        try {
          cw.addEventListener('afterprint', afterPrintHandler);
        } catch {
        }

        cw.focus();
        cw.print();

        fallbackResolveId = window.setTimeout(() => {
          cleanup();
          resolve();
        }, 15000);
      } catch (e) {
        cleanup();
        reject(e instanceof Error ? e : new Error(`Printen mislukt (url: ${printUrl})`));
      }
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as any;
      if (!data || typeof data !== 'object') return;
      if (data.token !== token) return;

      console.log('[rapport/print] Received iframe message', { type: data.type, token });

      if (data.type === 'disc_report_ready') {
        startPrint();
      }

      if (data.type === 'disc_report_error') {
        const msg = typeof data.message === 'string' ? data.message : 'Kon rapport niet laden';
        cleanup();
        reject(new Error(msg));
      }
    };

    if (shouldListenForMessages) {
      window.addEventListener('message', onMessage);
    }

    iframe.addEventListener('load', () => {
      console.log('[rapport/print] iframe load event fired');

      if (mode === 'onload') {
        startPrint();
      }
    });

    iframe.addEventListener('error', () => {
      console.error('[rapport/print] iframe error event fired');
    });

    iframe.src = printUrl;
    document.body.appendChild(iframe);

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(
        new Error(
          'Timeout bij laden van print rapport. Check de browser console voor CSP/X-Frame-Options errors (frame blocked) en controleer of /rapport/print in Network geladen wordt.'
        )
      );
    }, 30000);
  });
}


function PreviewPageContent() {
  const searchParams = useSearchParams();
  const attemptId = searchParams.get('attempt_id');

  const [report, setReport] = useState<DiscReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig | null>(null)
  const [deliveryLoading, setDeliveryLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!attemptId) {
        setError('Geen rapport ID opgegeven');
        setLoading(false);
        return;
      }

      try {
        // Fetch data from localStorage (set by quiz completion)
        const cachedData = localStorage.getItem(`quiz_result_${attemptId}`);

        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          const reportData: DiscReport = {
            profileCode: parsed.profileCode,
            natuurlijkeStijl: parsed.percentages.natural,
            responsStijl: parsed.percentages.response,
            assessmentDate: new Date().toISOString(),
            candidateName: parsed.candidateName || 'Deelnemer',
            insights: getInsightsForProfile(parsed.profileCode),
          };
          setReport(reportData);
        } else {
          setError('Geen resultaten gevonden. Mogelijk is de sessie verlopen.');
        }
      } catch (err) {
        console.error('Failed to load preview data:', err);
        setError('Er is een fout opgetreden bij het laden van je resultaten.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [attemptId]);

  useEffect(() => {
    const loadDeliveryConfig = async () => {
      if (!attemptId) return
      setDeliveryLoading(true)
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: sessionRes } = await supabase.auth.getSession()
        const token = sessionRes.session?.access_token
        if (!token) {
          setDeliveryConfig(null)
          return
        }

        const res = await fetch(`/api/rapport/delivery-config?attempt_id=${encodeURIComponent(attemptId)}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        })

        if (!res.ok) {
          setDeliveryConfig(null)
          return
        }

        const j = (await res.json()) as DeliveryConfig
        setDeliveryConfig(j)
      } catch (e) {
        console.warn('[rapport/preview] failed to load delivery config', e)
        setDeliveryConfig(null)
      } finally {
        setDeliveryLoading(false)
      }
    }

    loadDeliveryConfig()
  }, [attemptId])

  const handleDownloadReport = async () => {
    if (!attemptId || !report) return;

    setGeneratingToken(true);
    setDownloadError(null);

    try {
      // Get auth token
      const { supabase } = await import('@/lib/supabase');
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;

      if (!token) {
        throw new Error('Niet geauthenticeerd');
      }

      const response = await fetch('/api/rapport/download-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ attempt_id: attemptId }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const errorData = contentType.includes('application/json')
          ? await response.json().catch(() => ({} as any))
          : ({} as any);

        const requestId = (errorData as any)?.request_id;
        const mode = (errorData as any)?.mode;
        const statusFromBody = (errorData as any)?.status;
        const baseMsg =
          (errorData as any)?.error ||
          `Kon geen PDF genereren (${response.status}). Bekijk Network tab voor details.`;

        const details: string[] = [];
        if (typeof requestId === 'string' && requestId) details.push(`request_id=${requestId}`);
        if (typeof mode === 'string' && mode) details.push(`mode=${mode}`);
        if (typeof statusFromBody === 'number') details.push(`upstream_status=${statusFromBody}`);

        const msg = details.length > 0 ? `${baseMsg} (${details.join(', ')})` : baseMsg;
        throw new Error(msg);
      }

      const contentDisposition = response.headers.get('content-disposition') || '';
      const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
      const filename = filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : 'DISC-Rapport.pdf';

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download PDF:', err);
      setDownloadError(err instanceof Error ? err.message : 'Er is een fout opgetreden. Probeer het opnieuw.');
    } finally {
      setGeneratingToken(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !report) return <ErrorState message={error || undefined} />;

  const isTrainerOnly =
    deliveryConfig?.send_pdf_trainer === true && deliveryConfig?.send_pdf_user === false

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Success Message */}
          <div className="mb-8 bg-green-50 border border-green-200 rounded-2xl p-6 flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-green-900 mb-1">
                Bedankt voor het invullen!
              </h2>
              <p className="text-green-700 text-sm leading-relaxed">
                Je DISC profiel is succesvol berekend. Hieronder zie je een samenvatting van je resultaten.
                Klik op de knop onderaan om je volledige rapport te downloaden.
              </p>
            </div>
          </div>

          <HeroSection report={report} />

          <SummaryCard report={report} />

          <DiscChartSection report={report} viewMode="both" />

          {/* Download CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12"
          >
            <Card className="border-[#46915f] border-2 shadow-lg">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl text-[#1A1A1A]">
                  Download je volledige rapport
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                {isTrainerOnly ? (
                  <p className="text-slate-700 leading-relaxed max-w-2xl mx-auto">
                    Uw trainer heeft uw volledige DISC-profiel ontvangen. Dit profiel bevat uitgebreide inzichten,
                    communicatietips en praktische aanbevelingen. Hierin vindt u verdere toelichting en ter ondersteuning
                    van uw persoonlijke ontwikkeling.
                  </p>
                ) : (
                  <>
                    <p className="text-slate-600 mb-6 leading-relaxed max-w-2xl mx-auto">
                      Je volledige DISC rapport bevat uitgebreide inzichten, tips voor communicatie,
                      en praktische aanbevelingen. Download het om later terug te lezen. We zullen het ook in uw mail versturen.
                    </p>

                    <Button
                      onClick={handleDownloadReport}
                      disabled={generatingToken || deliveryLoading}
                      className="bg-[#46915f] hover:bg-[#3a7a4f] text-white h-12 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      {generatingToken ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Rapport voorbereiden...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-5 w-5" />
                          Download volledig rapport
                        </>
                      )}
                    </Button>

                    {downloadError ? (
                      <p className="text-sm text-red-700 mt-4">{downloadError}</p>
                    ) : null}

                    <p className="text-xs text-slate-400 mt-4">
                      De PDF wordt automatisch berekend en gedownload.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PreviewPageContent />
    </Suspense>
  );
}
