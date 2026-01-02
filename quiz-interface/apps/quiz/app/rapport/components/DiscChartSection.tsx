'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DiscReport } from '../types';

interface DiscChartSectionProps {
  report: DiscReport;
  viewMode?: 'both' | 'natural' | 'response';
  onViewModeChange?: (mode: 'both' | 'natural' | 'response') => void;
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg text-sm max-w-[200px]">
        <p className="font-bold text-[#1A1A1A] mb-1">{`Stijl ${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
            <div 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-600">
              {entry.name}: <span className="font-semibold text-[#1A1A1A]">{Math.round(entry.value)}%</span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function DiscChartSection({ report, viewMode = 'both', onViewModeChange }: DiscChartSectionProps) {
  const [internalViewMode, setInternalViewMode] = useState<'both' | 'natural' | 'response'>('both');
  
  // Use controlled mode if prop is provided, otherwise internal state
  const currentViewMode = onViewModeChange ? viewMode : internalViewMode;
  const handleViewChange = (mode: 'both' | 'natural' | 'response') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  // DISC color mapping per letter
  const DISC_COLORS: Record<string, string> = {
    D: '#cc151b', // Red
    I: '#ffcb04', // Yellow
    S: '#029939', // Green
    C: '#2665ad', // Blue
  };

  // Prepare data for Recharts
  const data = useMemo(() => {
    const traits = ['D', 'I', 'S', 'C'];
    return traits.map(trait => ({
      name: trait,
      Natuurlijk: Math.max(0, Math.min(100, report.natuurlijkeStijl[trait as keyof typeof report.natuurlijkeStijl])),
      Respons: Math.max(0, Math.min(100, report.responsStijl[trait as keyof typeof report.responsStijl])),
      color: DISC_COLORS[trait],
    }));
  }, [report]);



  const activeButtonStyle = "bg-[#E7F3ED] text-[#46915f] border-[#46915f] font-medium ring-1 ring-[#46915f]";
  const inactiveButtonStyle = "bg-white text-slate-600 border-slate-200 hover:bg-slate-50";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mb-8"
      id="scores"
    >
      <Card className="border-[#E6E6E6] shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl font-semibold text-[#1A1A1A]">Jouw Scores</CardTitle>
            
            {/* View Toggle */}
            <div className="flex p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => handleViewChange('both')}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-all ${currentViewMode === 'both' ? 'bg-white text-[#1A1A1A] shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Beide
              </button>
              <button
                onClick={() => handleViewChange('natural')}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-all ${currentViewMode === 'natural' ? 'bg-white text-[#1A1A1A] shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Natuurlijk
              </button>
              <button
                onClick={() => handleViewChange('response')}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-all ${currentViewMode === 'response' ? 'bg-white text-[#1A1A1A] shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Respons
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-[300px] w-full" role="img" aria-label="Staafdiagram met jouw DISC scores">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                barGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E6E6" />
                <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#666', fontSize: 14, fontWeight: 600 }} 
                  axisLine={{ stroke: '#E6E6E6' }}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fill: '#999', fontSize: 12 }} 
                  axisLine={false}
                  tickLine={false}
                  tickCount={6}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                
                {(currentViewMode === 'both' || currentViewMode === 'natural') && (
                  <Bar 
                    dataKey="Natuurlijk" 
                    radius={[4, 4, 0, 0]} 
                    animationDuration={1000}
                    name="Natuurlijke Stijl"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-nat-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                )}
                
                {(currentViewMode === 'both' || currentViewMode === 'response') && (
                  <Bar 
                    dataKey="Respons" 
                    radius={[4, 4, 0, 0]} 
                    animationDuration={1000}
                    animationBegin={200}
                    name="Respons Stijl"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-res-${index}`} fill={entry.color} opacity={0.6} />
                    ))}
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 text-center">
             <p className="text-xs text-slate-400 italic">
               * Scores zijn indicatief en gebaseerd op je antwoorden op {new Date(report.assessmentDate).toLocaleDateString()}.
               <br/>Meer uitleg vind je in het volledige rapport.
             </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
