'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { DiscReport } from '../types';

interface SummaryCardProps {
  report: DiscReport;
}

export function SummaryCard({ report }: SummaryCardProps) {
  // Determine dominant traits based on profile code
  const primaryTrait = report.profileCode.charAt(0);
  const secondaryTrait = report.profileCode.length > 1 ? report.profileCode.charAt(1) : null;

  const traitDescriptions: Record<string, string> = {
    'D': 'Dominantie staat voor daadkracht, resultaatgerichtheid en directheid. Je neemt graag de leiding en bent gefocust op doelen.',
    'I': 'Invloed staat voor enthousiasme, optimisme en overtuigingskracht. Je bent mensgericht en brengt energie in sociale situaties.',
    'S': 'Stabiliteit staat voor geduld, loyaliteit en hulpvaardigheid. Je zorgt voor harmonie en bent een betrouwbare teamspeler.',
    'C': 'ConsciÃ«ntieusheid staat voor nauwkeurigheid, analyse en kwaliteit. Je bent objectief en let op de details.',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-8"
    >
      <Card className="border-[#E6E6E6] shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div>
              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#E7F3ED] text-[#2F6B4F] flex items-center justify-center font-bold text-sm">1</span>
                Jouw Profiel
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Je DISC profiel is <strong className="text-[#2F6B4F]">{report.profileCode}</strong>.
                Dit betekent dat je vooral handelt vanuit {traitDescriptions[primaryTrait].toLowerCase()}
                {secondaryTrait && ` Daarnaast is ${traitDescriptions[secondaryTrait].toLowerCase()}`}
              </p>
            </div>

            <div className="md:border-l md:border-[#E6E6E6] md:pl-12">
              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#E7F3ED] text-[#2F6B4F] flex items-center justify-center font-bold text-sm">2</span>
                Wat betekent dit?
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Je communicatiestijl kenmerkt zich door een combinatie van deze eigenschappen.
                In het volledige rapport lees je hoe dit zich uit in samenwerking, communicatie en leiderschap.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
