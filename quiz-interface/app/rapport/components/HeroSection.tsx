'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { SparrowIcon } from './SparrowIcon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DiscReport } from '../types';

interface HeroSectionProps {
  report: DiscReport;
}

export function HeroSection({ report }: HeroSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyProfileCode = () => {
    navigator.clipboard.writeText(report.profileCode);
    setCopied(true);
    // Track analytics event (mock)
    console.log('event: copy_profile_code', { code: report.profileCode });
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <section className="relative overflow-hidden mb-8">
      {/* Sparrow Icon Background */}
      <div className="absolute top-0 right-0 w-64 h-64 -mt-10 -mr-10 pointer-events-none select-none z-0">
        <SparrowIcon className="w-full h-full text-[#2F6B4F]" opacity={0.08} />
      </div>

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
                <span>Rapport van {report.candidateName || 'Kandidaat'}</span>
                <span>â€¢</span>
                <span>{formatDate(report.assessmentDate)}</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-semibold text-[#1A1A1A] tracking-tight">
                Jouw DISC Profiel
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative group">
                <div
                  className="flex items-center gap-3 bg-white border border-[#E6E6E6] rounded-2xl px-6 py-4 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  onClick={handleCopyProfileCode}
                >
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Profielcode</span>
                    <span className="text-4xl md:text-5xl font-bold text-[#2F6B4F] leading-none">
                      {report.profileCode}
                    </span>
                  </div>
                  <div className="h-10 w-px bg-slate-200 mx-1"></div>
                  <button
                    className="p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-[#2F6B4F] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] focus:ring-offset-2"
                    aria-label="Kopieer profielcode"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                {/* Toast Notification */}
                {copied && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-[#1A1A1A] text-white text-xs rounded-full shadow-lg whitespace-nowrap"
                  >
                    Gekopieerd!
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
