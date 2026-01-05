'use client';

import React from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SparrowIcon } from './SparrowIcon';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Er ging iets mis",
  message = "We konden je rapport niet laden. Mogelijk is de link verlopen of ongeldig.",
  onRetry
}: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E6E6E6] p-8 text-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 -mt-8 -mr-8 pointer-events-none opacity-5">
          <SparrowIcon className="w-full h-full text-red-500" />
        </div>

        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>

        <h2 className="text-xl font-bold text-[#1A1A1A] mb-3 relative z-10">
          {title}
        </h2>

        <p className="text-slate-600 mb-8 relative z-10 leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col gap-3 relative z-10">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-[#2F6B4F] hover:bg-[#25543D] text-white w-full"
            >
              Probeer opnieuw
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full border-[#E6E6E6] text-slate-600 hover:bg-slate-50"
            onClick={() => window.location.href = '/'}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar start
          </Button>
        </div>
      </div>
    </div>
  );
}
