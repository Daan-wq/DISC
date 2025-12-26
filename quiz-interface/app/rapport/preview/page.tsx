'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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

export default function PreviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const attemptId = searchParams.get('attempt_id');

  const [report, setReport] = useState<DiscReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);

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

  const handleDownloadReport = async () => {
    if (!attemptId) return;

    setGeneratingToken(true);

    try {
      // Get auth token
      const { supabase } = await import('@/lib/supabase');
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;

      if (!token) {
        throw new Error('Niet geauthenticeerd');
      }

      // Generate print token
      const response = await fetch('/api/rapport/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ attempt_id: attemptId }),
      });

      if (!response.ok) {
        throw new Error('Kon geen print token genereren');
      }

      const { token: printToken } = await response.json();

      // Open print page in new window
      const printUrl = `/rapport/print?token=${printToken}`;
      window.open(printUrl, '_blank');
    } catch (err) {
      console.error('Failed to generate print token:', err);
      alert('Er is een fout opgetreden. Probeer het opnieuw.');
    } finally {
      setGeneratingToken(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !report) return <ErrorState message={error || undefined} />;

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
                Klik op de knop onderaan om je volledige rapport te downloaden als PDF.
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
            <Card className="border-[#2F6B4F] border-2 shadow-lg">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl text-[#1A1A1A]">
                  Download je volledige rapport
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-slate-600 mb-6 leading-relaxed max-w-2xl mx-auto">
                  Je volledige DISC rapport bevat uitgebreide inzichten, tips voor communicatie,
                  en praktische aanbevelingen. Download het als PDF om later terug te lezen.
                </p>
                
                <Button
                  onClick={handleDownloadReport}
                  disabled={generatingToken}
                  className="bg-[#2F6B4F] hover:bg-[#25543D] text-white h-12 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {generatingToken ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Rapport voorbereiden...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      Download volledig rapport (PDF)
                    </>
                  )}
                </Button>

                <p className="text-xs text-slate-400 mt-4">
                  Het rapport wordt lokaal op je apparaat gegenereerd en geopend in een nieuw venster.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
