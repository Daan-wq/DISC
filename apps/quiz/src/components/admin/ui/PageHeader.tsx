'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  tabs?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  action,
  tabs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {description && (
            <p className="text-sm text-slate-500">{description}</p>
          )}
        </div>
        {action && <div className="flex items-center gap-3">{action}</div>}
      </div>
      {tabs && <div>{tabs}</div>}
    </div>
  )
}

interface TabsProps {
  children: ReactNode
  className?: string
}

export function Tabs({ children, className }: TabsProps) {
  return (
    <div
      className={cn(
        'flex gap-1 p-1 rounded-lg bg-slate-100 w-fit',
        className
      )}
    >
      {children}
    </div>
  )
}

interface TabProps {
  active?: boolean
  children: ReactNode
  onClick?: () => void
  className?: string
}

export function Tab({ active, children, onClick, className }: TabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-md transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        active
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50',
        className
      )}
    >
      {children}
    </button>
  )
}
