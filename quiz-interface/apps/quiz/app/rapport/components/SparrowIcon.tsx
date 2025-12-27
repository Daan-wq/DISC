import React from 'react';

export function SparrowIcon({ className, opacity = 0.1 }: { className?: string; opacity?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={{ opacity }}
      aria-hidden="true"
    >
      {/* Simplified sparrow-like outline based on the request */}
      <path d="M70 20 C 80 20, 90 25, 90 35 C 90 45, 80 50, 70 50 L 60 50 L 50 60 L 40 60 C 30 60, 20 50, 20 40 C 20 30, 30 20, 40 20 Z" />
      <path d="M40 20 C 35 15, 30 15, 25 20" />
      <path d="M20 40 L 10 45 L 15 50" />
      <circle cx="75" cy="30" r="2" fill="currentColor" />
    </svg>
  );
}
