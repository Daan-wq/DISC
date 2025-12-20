'use client'

/**
 * Accessibility Components & Utilities
 * 
 * These components help make the app accessible to users with disabilities:
 * - Skip links: Allow keyboard users to skip navigation
 * - Focus management: Ensure focus states are visible
 * - ARIA labels: Provide context for screen readers
 */

import React from 'react'

/**
 * SkipLink Component
 * Hidden link that appears on Tab press
 * Allows keyboard users to skip to main content
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:bg-blue-600 focus:text-white focus:p-4 focus:rounded-b"
    >
      Ga naar hoofdinhoud
    </a>
  )
}

/**
 * Semantic HTML wrapper for main content
 * Helps screen readers understand page structure
 */
export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="focus:outline-none">
      {children}
    </main>
  )
}

/**
 * Semantic HTML wrapper for navigation
 */
export function Navigation({ children }: { children: React.ReactNode }) {
  return (
    <nav className="focus:outline-none" aria-label="Hoofdnavigatie">
      {children}
    </nav>
  )
}

/**
 * Accessible button with focus states
 */
export function AccessibleButton({
  children,
  ariaLabel,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { ariaLabel?: string }) {
  return (
    <button
      aria-label={ariaLabel}
      className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-all"
      {...props}
    >
      {children}
    </button>
  )
}

/**
 * Accessible link with focus states
 */
export function AccessibleLink({
  children,
  ariaLabel,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { ariaLabel?: string }) {
  return (
    <a
      aria-label={ariaLabel}
      className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-all"
      {...props}
    >
      {children}
    </a>
  )
}

/**
 * Screen reader only text
 * Visible only to screen readers, hidden from visual users
 */
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  )
}

/**
 * Accessible form field with label
 */
export function AccessibleFormField({
  id,
  label,
  error,
  required,
  children,
}: {
  id: string
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-600 ml-1" aria-label="verplicht">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
