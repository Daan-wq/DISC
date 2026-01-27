'use client'

import { useEffect } from 'react'
import { cn } from '../../../lib/utils'

type ConfirmVariant = 'danger' | 'default'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Bevestigen',
  cancelText = 'Annuleren',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  const confirmButtonClass =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
      : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={loading ? undefined : onCancel}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-xl bg-white shadow-xl border border-slate-200"
      >
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        </div>

        <div className="px-6 py-4">
          {description ? <p className="text-sm text-slate-600 whitespace-pre-line break-words">{description}</p> : null}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={cn(
              'h-10 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 text-sm font-medium',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'h-10 px-4 rounded-lg text-sm font-medium',
              confirmButtonClass,
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? 'Bezig...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
