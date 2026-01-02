'use client';

import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

export function TrustFooter() {
  return (
    <footer className="border-t border-[#E6E6E6] pt-8 pb-12 mt-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#46915f]" />
          <span>Je resultaten zijn privé. De PDF wordt lokaal voorbereid.</span>
        </div>
        
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-[#46915f] transition-colors">Privacybeleid</a>
          <a href="#" className="hover:text-[#46915f] transition-colors">Algemene Voorwaarden</a>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Beveiligde verbinding</span>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-8 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} The Lean Communication. Alle rechten voorbehouden.
      </div>
    </footer>
  );
}
