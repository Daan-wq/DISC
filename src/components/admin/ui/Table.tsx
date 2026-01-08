'use client'

import { cn } from '@/lib/utils'
import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react'
import { Spinner } from '@/components/ui/Spinner'

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('overflow-visible rounded-xl border border-slate-200', className)}>
      <table className="min-w-full divide-y divide-slate-200">{children}</table>
    </div>
  )
}

interface TableHeaderProps {
  children: ReactNode
  className?: string
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return <thead className={cn('bg-slate-50', className)}>{children}</thead>
}

interface TableBodyProps {
  children: ReactNode
  className?: string
}

export function TableBody({ children, className }: TableBodyProps) {
  return (
    <tbody className={cn('divide-y divide-slate-200 bg-white', className)}>
      {children}
    </tbody>
  )
}

interface TableRowProps {
  children: ReactNode
  className?: string
  highlight?: boolean
  onClick?: () => void
}

export function TableRow({ children, className, highlight, onClick }: TableRowProps) {
  return (
    <tr
      className={cn(
        'transition-colors',
        highlight ? 'bg-amber-50' : 'hover:bg-slate-50',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode
  className?: string
  sortable?: boolean
  sorted?: 'asc' | 'desc' | false
}

export function TableHead({
  children,
  className,
  sortable,
  sorted,
  ...props
}: TableHeadProps) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider',
        sortable && 'cursor-pointer select-none hover:text-slate-900',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortable && sorted && (
          <span className="text-slate-400">
            {sorted === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  )
}

interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode
  className?: string
}

export function TableCell({ children, className, ...props }: TableCellProps) {
  return (
    <td
      className={cn('px-4 py-3 text-sm text-slate-700 whitespace-nowrap', className)}
      {...props}
    >
      {children}
    </td>
  )
}

interface TableEmptyProps {
  colSpan: number
  message?: string
  action?: ReactNode
}

export function TableEmpty({
  colSpan,
  message = 'Geen data gevonden',
  action,
}: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <p className="text-sm text-slate-500">{message}</p>
          {action}
        </div>
      </td>
    </tr>
  )
}

interface TableLoadingProps {
  colSpan: number
  rows?: number
}

export function TableLoading({ colSpan, rows = 5 }: TableLoadingProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <div className="flex items-center justify-center">
          <Spinner className="h-6 w-6 text-slate-400" />
        </div>
      </td>
    </tr>
  )
}
