'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { HeroSection } from '../components/HeroSection';
import { SummaryCard } from '../components/SummaryCard';
import { DiscChartSection } from '../components/DiscChartSection';
import { InsightsGrid } from '../components/InsightsGrid';
import { TrustFooter } from '../components/TrustFooter';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { DiscReport, ProfileCode } from '../types';
import { getInsightsForProfile } from '../components/data';

// Reuse the same mock fetcher or import it if extracted
const fetchReportByCode = async (code: string | null): Promise<DiscReport> => {
  await new Promise(resolve => setTimeout(resolve, 800)); // Shorter delay for print view

  if (!code) {
    throw new Error('Geen profielcode opgegeven');
  }

  // Validate code format roughly
  const validCode = code.toUpperCase() as ProfileCode;

  return {
    profileCode: validCode,
    natuurlijkeStijl: { D: 78, I: 54, S: 28, C: 15 },
    responsStijl: { D: 65, I: 60, S: 40, C: 30 },
    assessmentDate: new Date().toISOString(),
    candidateName: 'J. Doe',
    insights: getInsightsForProfile(validCode),
  };
};

export default function PrintPage() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  const [report, setReport] = useState<DiscReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchReportByCode(code);
        setReport(data);

        // Auto-print when data is ready
        setTimeout(() => {
          window.print();
        }, 1000);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Er is een onbekende fout opgetreden');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [code]);

  // Inject print styles specific to this page
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { margin: 1.5cm; }
        body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        /* Hide UI elements that might have leaked in */
        header, footer, nav { display: none; }
        /* Ensure charts print correctly */
        .recharts-responsive-container { width: 100% !important; height: 300px !important; }
        /* Reset shadows for cleaner print */
        .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }
        .border { border: 1px solid #ddd !important; }
      }
      /* Hide scrollbars during print prep */
      body { overflow-y: scroll; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (loading) return <LoadingState />;
  if (error || !report) return <ErrorState message={error || undefined} />;

  return (
    <div className="min-h-screen bg-white p-8 max-w-5xl mx-auto">
      <div className="mb-4 text-center print:hidden">
        <p className="text-sm text-slate-500 mb-2">Het printvenster opent automatisch...</p>
        <button
          onClick={() => window.print()}
          className="text-[#2F6B4F] underline text-sm font-medium"
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
        Rapport gegenereerd op {new Date().toLocaleDateString('nl-NL')} â€¢ Vertrouwelijk â€¢ The Lean Communication
      </div>
    </div>
  );
}
