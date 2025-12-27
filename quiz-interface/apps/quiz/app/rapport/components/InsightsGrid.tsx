'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Target, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DiscReport, Insight } from '../types';

interface InsightsGridProps {
  report: DiscReport;
}

export function InsightsGrid({ report }: InsightsGridProps) {
  // Group insights by category for display
  const strengths = report.insights.filter(i => i.category === 'strength');
  const communication = report.insights.filter(i => i.category === 'communication');
  const values = report.insights.filter(i => i.category === 'value');

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
      id="inzichten"
    >
      {/* Strengths Column */}
      <motion.div variants={item} className="h-full">
        <Card className="h-full border-[#E6E6E6] shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
              <Target className="w-5 h-5 text-[#2F6B4F]" />
            </div>
            <CardTitle className="text-lg text-[#1A1A1A]">Krachten</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {strengths.length > 0 ? (
                strengths.map((insight, idx) => (
                  <li key={idx} className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-800 text-sm">{insight.title}</span>
                    <span className="text-slate-600 text-sm leading-relaxed">{insight.description}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-400 text-sm italic">Geen specifieke krachten beschikbaar voor dit profiel.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* Communication Column */}
      <motion.div variants={item} className="h-full">
        <Card className="h-full border-[#E6E6E6] shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <CardTitle className="text-lg text-[#1A1A1A]">Communicatie</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {communication.length > 0 ? (
                communication.map((insight, idx) => (
                  <li key={idx} className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-800 text-sm">{insight.title}</span>
                    <span className="text-slate-600 text-sm leading-relaxed">{insight.description}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-400 text-sm italic">Geen communicatiestijl informatie beschikbaar.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* Values/Work Style Column */}
      <motion.div variants={item} className="h-full md:col-span-2 lg:col-span-1">
        <Card className="h-full border-[#E6E6E6] shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-2">
              <Lightbulb className="w-5 h-5 text-amber-600" />
            </div>
            <CardTitle className="text-lg text-[#1A1A1A]">Waarde voor het team</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {values.length > 0 ? (
                values.map((insight, idx) => (
                  <li key={idx} className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-800 text-sm">{insight.title}</span>
                    <span className="text-slate-600 text-sm leading-relaxed">{insight.description}</span>
                  </li>
                ))
              ) : (
                // Fallback content if empty
                <li className="text-slate-600 text-sm leading-relaxed">
                  Je brengt unieke kwaliteiten mee die bijdragen aan de teamdynamiek. 
                  In het volledige rapport lees je meer over je specifieke rol en bijdrage.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
