'use client';

import React, { useState } from 'react';
import { Download, Printer, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner'
import { DiscReport } from '../types';

interface DownloadCTAProps {
  report: DiscReport;
}

type DownloadState = 'idle' | 'preparing' | 'opening-print';

export function DownloadCTA({ report }: DownloadCTAProps) {
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');

  const handleDownload = async () => {
    // Analytics hook (mock)
    console.log('event: pdf_download_clicked', { code: report.profileCode });

    try {
      setDownloadState('preparing');
      
      // Artificial delay to simulate "preparing" state and allow UI to update
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Wait for fonts to be ready (production safeguard)
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      setDownloadState('opening-print');
      
      // Slight delay before opening print dialog so user sees the state change
      setTimeout(() => {
        window.print();
        // Reset state after print dialog is (presumably) closed or opened
        setTimeout(() => setDownloadState('idle'), 2000);
      }, 500);

    } catch (error) {
      console.error('Print failed:', error);
      setDownloadState('idle');
    }
  };

  const handleOpenNewTab = () => {
    console.log('event: print_opened_new_tab');
    window.location.assign(`/rapport/print?code=${report.profileCode}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-[#46915f] rounded-2xl p-8 md:p-12 text-center text-white relative overflow-hidden mb-12"
      id="pdf"
    >
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-white blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Open je rapport
        </h2>
        <p className="text-green-50 text-lg mb-8 leading-relaxed">
          Open je rapport en sla het op als PDF om het later terug te lezen of te delen met je team.
          Je krijgt een uitgebreid document met alle details van jouw profiel.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            onClick={handleDownload}
            disabled={downloadState !== 'idle'}
            className="bg-white text-[#46915f] hover:bg-green-50 border-0 h-12 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all min-w-[240px]"
          >
            {downloadState === 'idle' && (
              <>
                <Download className="mr-2 h-5 w-5" />
                Open je rapport
              </>
            )}
            {downloadState === 'preparing' && (
              <>
                <Spinner className="mr-2 h-5 w-5" />
                Rapport voorbereiden...
              </>
            )}
            {downloadState === 'opening-print' && (
              <>
                <Spinner className="mr-2 h-5 w-5" />
                Printvenster openen...
              </>
            )}
          </Button>

          {/* Fallback option */}
          <button
            onClick={handleOpenNewTab}
            className="text-green-100 hover:text-white text-sm font-medium underline underline-offset-4 flex items-center gap-1 mt-2 sm:mt-0"
          >
            Werkt het niet? Open in dit tabblad
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Helper text */}
        <p className="text-green-200/80 text-sm mt-6">
          Je browser opent een printvenster. Kies bij bestemming voor <strong>&apos;Opslaan als PDF&apos;</strong>.
        </p>
      </div>
    </motion.div>
  );
}
