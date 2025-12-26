'use client';

import React from 'react';
import { SparrowIcon } from './SparrowIcon';

export function LoadingState() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="relative w-24 h-24 mb-6">
        {/* Pulsing background */}
        <div className="absolute inset-0 bg-[#E7F3ED] rounded-full animate-ping opacity-75"></div>
        
        {/* Sparrow Icon */}
        <div className="relative z-10 w-full h-full flex items-center justify-center bg-white rounded-full shadow-sm border border-[#E6E6E6]">
          <SparrowIcon className="w-12 h-12 text-[#2F6B4F]" opacity={0.8} />
        </div>
      </div>
      
      <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2 animate-pulse">
        Rapport laden...
      </h2>
      <p className="text-slate-500 text-sm max-w-xs text-center">
        We halen je resultaten op en bereiden je persoonlijke analyse voor.
      </p>
    </div>
  );
}
