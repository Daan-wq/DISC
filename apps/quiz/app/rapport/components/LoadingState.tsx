'use client';

import React from 'react';
import { Spinner } from '@/components/ui/Spinner'

export function LoadingState() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <Spinner className="h-8 w-8 text-[#46915f] mb-6" />
      
      <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">
        Rapport laden...
      </h2>
      <p className="text-slate-500 text-sm max-w-xs text-center">
        We halen je resultaten op en bereiden je persoonlijke analyse voor.
      </p>
    </div>
  );
}
