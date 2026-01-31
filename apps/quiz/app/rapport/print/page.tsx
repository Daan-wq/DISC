'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { HeroSection } from '../components/HeroSection';
import { SummaryCard } from '../components/SummaryCard';
import { DiscChartSection } from '../components/DiscChartSection';
import { InsightsGrid } from '../components/InsightsGrid';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { DiscReport } from '../types';
import { getInsightsForProfile } from '../components/data';

function PrintPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [report, setReport] = useState<DiscReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const loadData = async () => {
      if (!token) {
        setError('Geen geldig token opgegeven');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

        const cacheKey = `print_data_${token}`;
        const printedKey = `print_done_${token}`;
        const cached = typeof window !== 'undefined' ? window.sessionStorage.getItem(cacheKey) : null;
        const alreadyPrinted = typeof window !== 'undefined' ? !!window.sessionStorage.getItem(printedKey) : false;

        if (cached) {
          const data = JSON.parse(cached);
          const reportData: DiscReport = {
            profileCode: data.profileCode,
            natuurlijkeStijl: data.natuurlijkeStijl,
            responsStijl: data.responsStijl,
            assessmentDate: data.assessmentDate,
            candidateName: data.candidateName,
            insights: getInsightsForProfile(data.profileCode),
          };

          if (!mountedRef.current) return;
          setReport(reportData);

          if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
            console.log('[print] Fonts ready');
          }

          if (!mountedRef.current) return;
          setFontsReady(true);

          try {
            window.parent?.postMessage(
              {
                type: 'disc_report_ready',
                token,
              },
              window.location.origin
            );
          } catch {
          }

          if (!isInIframe && !alreadyPrinted) {
            setTimeout(() => {
              try {
                window.sessionStorage.setItem(printedKey, new Date().toISOString());
              } catch {}
              console.log('[print] Triggering window.print()');
              window.print();
            }, 1500);
          }

          return;
        }

        // Fetch data using token
        const response = await fetch(`/api/rapport/get-data?token=${token}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({} as any));
          const msg = (errorData as any)?.error || `Kon rapport niet laden (${response.status})`;
          if (!mountedRef.current) return;
          setError(msg);

          try {
            window.parent?.postMessage(
              {
                type: 'disc_report_error',
                token,
                message: msg,
              },
              window.location.origin
            );
          } catch {
          }
          return;
        }

        const data = await response.json();

        try {
          window.sessionStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {}
        
        const reportData: DiscReport = {
          profileCode: data.profileCode,
          natuurlijkeStijl: data.natuurlijkeStijl,
          responsStijl: data.responsStijl,
          assessmentDate: data.assessmentDate,
          candidateName: data.candidateName,
          insights: getInsightsForProfile(data.profileCode),
        };

        setReport(reportData);
        
        // Wait for fonts to be ready before printing
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
          console.log('[print] Fonts ready');
        }
        
        setFontsReady(true);
        
        try {
          window.parent?.postMessage(
            {
              type: 'disc_report_ready',
              token,
            },
            window.location.origin
          );
        } catch {
        }

        // Small delay to ensure everything is rendered
        if (!isInIframe) {
          setTimeout(() => {
            try {
              window.sessionStorage.setItem(`print_done_${token}`, new Date().toISOString());
            } catch {}
            console.log('[print] Triggering window.print()');
            window.print();
          }, 1500);
        }
        
      } catch (err) {
        console.error('[print] Error loading data:', err);
        const msg = err instanceof Error ? err.message : 'Er is een onbekende fout opgetreden';
        setError(msg);

        try {
          window.parent?.postMessage(
            {
              type: 'disc_report_error',
              token,
              message: msg,
            },
            window.location.origin
          );
        } catch {
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
    return () => {
      mountedRef.current = false;
    };
  }, [token]);

  // Inject print styles specific to this page
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @page { 
        size: A4; 
        margin: 1.5cm; 
      }
      
      @media print {
        html, body { 
          width: 210mm; 
          height: 297mm; 
          margin: 0; 
          padding: 0;
          background: white; 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact; 
        }
        
        /* Hide UI elements */
        header, footer, nav, .no-print { display: none !important; }
        
        /* Ensure charts print correctly */
        .recharts-responsive-container { 
          width: 100% !important; 
          height: 300px !important; 
        }
        
        /* Reset shadows for cleaner print */
        .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }
        .border { border: 1px solid #ddd !important; }
        
        /* Page breaks */
        .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        .break-before-page { break-before: page; page-break-before: always; }
        
        /* Ensure colors print */
        * { 
          -webkit-print-color-adjust: exact !important; 
          print-color-adjust: exact !important; 
        }
      }
      
      /* Hide scrollbars during print prep */
      body { overflow-y: scroll; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#46915f] mx-auto mb-4"></div>
          <p className="text-slate-600">Rapport laden...</p>
          {fontsReady && <p className="text-xs text-slate-400 mt-2">Lettertypes geladen</p>}
        </div>
      </div>
    );
  }
  
  if (error || !report) return <ErrorState message={error || undefined} />;

  return (
    <div className="min-h-screen bg-white p-8 max-w-5xl mx-auto">
      <div className="mb-4 text-center no-print">
        <p className="text-sm text-slate-500 mb-2">Het printvenster opent automatisch...</p>
        <button 
          onClick={() => window.print()}
          className="text-[#46915f] underline text-sm font-medium hover:text-[#3a7a4f]"
        >
          Printvenster handmatig openen
        </button>
      </div>

      <HeroSection report={report} />
      
      <div className="mb-8">
        <SummaryCard report={report} />
      </div>
      
      <div className="mb-8 break-inside-avoid">
        <DiscChartSection report={report} viewMode="both" />
      </div>
      
      <div className="break-before-page">
        <InsightsGrid report={report} />
      </div>
      
      <div className="mt-12 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
        Rapport berekend op {new Date().toLocaleDateString('nl-NL')} • Vertrouwelijk • The Lean Communication
      </div>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PrintPageContent />
    </Suspense>
  );
}
