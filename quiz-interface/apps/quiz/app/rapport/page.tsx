'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { HeroSection } from './components/HeroSection';
import { SummaryCard } from './components/SummaryCard';
import { DiscChartSection } from './components/DiscChartSection';
import { InsightsGrid } from './components/InsightsGrid';
import { DownloadCTA } from './components/DownloadCTA';
import { TrustFooter } from './components/TrustFooter';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { SparrowIcon } from './components/SparrowIcon';

import { DiscReport, ProfileCode, Insight } from './types';
import { getInsightsForProfile } from './components/data';

// Mock data fetcher - replace with real API call
const fetchReport = async (id: string | null): Promise<DiscReport> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  if (!id) {
    throw new Error('Geen rapport ID opgegeven');
  }

  // Simulate error for specific ID
  if (id === 'error') {
    throw new Error('Rapport niet gevonden');
  }

  // Mock response based on ID or random
  const profileCode: ProfileCode = (['DI', 'IS', 'SC', 'CD'][Math.floor(Math.random() * 4)] as ProfileCode);
  
  return {
    profileCode: profileCode,
    natuurlijkeStijl: { D: 78, I: 54, S: 28, C: 15 },
    responsStijl: { D: 65, I: 60, S: 40, C: 30 },
    assessmentDate: new Date().toISOString(),
    candidateName: 'J. Doe',
    insights: getInsightsForProfile(profileCode),
  };
};

function RapportPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // URL State
  const reportId = searchParams.get('id');
  const initialView = (searchParams.get('view') as 'both' | 'natural' | 'response') || 'both';
  const autoPrint = searchParams.get('print') === '1';
  const tab = searchParams.get('tab');

  // Local State
  const [report, setReport] = useState<DiscReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'both' | 'natural' | 'response'>(initialView);

  // Refs for scrolling
  const scoresRef = useRef<HTMLDivElement>(null);
  const insightsRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  // Initial Fetch
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // In production, this would use the actual ID to fetch data
        // For demo/prototype, we just use the ID existence check
        const data = await fetchReport(reportId || 'demo'); 
        setReport(data);
        
        // Track view event
        console.log('event: report_viewed', { code: data.profileCode });
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Er is een onbekende fout opgetreden');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [reportId]);

  // Handle URL updates when view changes
  const handleViewModeChange = (mode: 'both' | 'natural' | 'response') => {
    setViewMode(mode);
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', mode);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Handle auto-scroll based on "tab" param
  useEffect(() => {
    if (!loading && report && tab) {
      const scrollOptions: ScrollIntoViewOptions = { behavior: 'smooth', block: 'start' };
      if (tab === 'scores' && scoresRef.current) scoresRef.current.scrollIntoView(scrollOptions);
      if (tab === 'inzichten' && insightsRef.current) insightsRef.current.scrollIntoView(scrollOptions);
      if (tab === 'pdf' && pdfRef.current) pdfRef.current.scrollIntoView(scrollOptions);
    }
  }, [loading, report, tab]);

  // Handle auto-print
  useEffect(() => {
    if (!loading && report && autoPrint) {
      // Small delay to ensure render is complete
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [loading, report, autoPrint]);

  // Add print styles
  useEffect(() => {
    // Inject print styles
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { margin: 1.5cm; }
        body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none !important; }
        .print-break-inside-avoid { break-inside: avoid; }
        .print-break-before { break-before: page; }
        /* Ensure charts print correctly */
        .recharts-responsive-container { width: 100% !important; height: 300px !important; }
        /* Hide shadow and border for clean print */
        .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }
        .border { border: 1px solid #ddd !important; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (loading) return <LoadingState />;
  if (error || !report) return <ErrorState message={error || undefined} onRetry={() => window.location.reload()} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <HeroSection report={report} />
            
            <SummaryCard report={report} />
            
            <div ref={scoresRef} className="print-break-inside-avoid">
              <DiscChartSection 
                report={report} 
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
              />
            </div>
            
            <div ref={insightsRef} className="print-break-before">
              <InsightsGrid report={report} />
            </div>
            
            <div ref={pdfRef} className="no-print">
              <DownloadCTA report={report} />
            </div>
            
            <TrustFooter />
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Print Footer (only visible in print) */}
      <div className="hidden print:block fixed bottom-0 left-0 w-full text-center text-xs text-slate-400 p-4">
        Rapport gegenereerd op {new Date().toLocaleDateString('nl-NL')} • Vertrouwelijk
      </div>
    </div>
  );
}

export default function RapportPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RapportPageContent />
    </Suspense>
  );
}
