'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 border-4 border-[#46915f] border-t-transparent rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-[#46915f] animate-spin" />
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
