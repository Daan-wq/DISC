'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RapportContent, type DiscReport } from '@/components/rapport-content';
import { Skeleton } from '@/components/ui/skeleton';

function PrintPageLoading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#469560] mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium text-lg">Rapport voorbereiden voor printen...</p>
        <div className="mt-8 space-y-4 max-w-md mx-auto px-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

function PrintPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [report, setReport] = useState<DiscReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
          };

          if (!mountedRef.current) return;
          setReport(reportData);
          setLoading(false);

          if (!alreadyPrinted) {
            setTimeout(() => {
              try {
                window.sessionStorage.setItem(printedKey, new Date().toISOString());
              } catch {}
              window.print();
            }, 2000);
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
          setLoading(false);
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
        };

        if (!mountedRef.current) return;
        setReport(reportData);
        setLoading(false);
        
        // Small delay to ensure everything is rendered
        setTimeout(() => {
          try {
            window.sessionStorage.setItem(`print_done_${token}`, new Date().toISOString());
          } catch {}
          window.print();
        }, 2000);
        
      } catch (err) {
        console.error('[print] Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Er is een onbekende fout opgetreden');
        setLoading(false);
      }
    };

    loadData();
    return () => {
      mountedRef.current = false;
    };
  }, [token]);

  if (loading) return <PrintPageLoading />;
  
  if (error || !report) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full border-2 border-red-100 rounded-3xl p-8 text-center space-y-4 shadow-apple-lg">
          <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <span className="text-red-600 text-2xl font-bold">!</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Rapport niet gevonden</h1>
          <p className="text-slate-600">
            {error || 'We konden je DISC-rapport niet laden. Controleer de link en probeer het opnieuw.'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="print-page-wrapper">
      <div className="no-print fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white/80 backdrop-blur-md border border-slate-200 px-6 py-3 rounded-full shadow-apple-lg flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <p className="text-sm font-medium text-slate-600">Het printvenster opent automatisch...</p>
        <div className="h-4 w-[1px] bg-slate-200" />
        <button 
          onClick={() => window.print()}
          className="text-[#469560] text-sm font-bold hover:underline"
        >
          Nu printen
        </button>
      </div>
      
      <RapportContent initialReport={report} isPrintMode={true} />
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<PrintPageLoading />}>
      <PrintPageContent />
    </Suspense>
  );
}
