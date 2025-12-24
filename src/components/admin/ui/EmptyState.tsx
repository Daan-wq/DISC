'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { FileText, Inbox, Search, Users } from 'lucide-react'

type EmptyStateVariant = 'default' | 'search' | 'users' | 'documents'

const icons: Record<EmptyStateVariant, ReactNode> = {
  default: <Inbox className="w-8 h-8" />,
  search: <Search className="w-8 h-8" />,
  users: <Users className="w-8 h-8" />,
  documents: <FileText className="w-8 h-8" />,
}

interface EmptyStateProps {
  title?: string
  description?: string
  action?: ReactNode
  variant?: EmptyStateVariant
  icon?: ReactNode
  className?: string
}

export function EmptyState({
  title = 'Geen data',
  description = 'Er zijn nog geen items om te tonen.',
  action,
  variant = 'default',
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        {icon || icons[variant]}
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  )
}
