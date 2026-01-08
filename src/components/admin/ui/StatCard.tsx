'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: {
    value: number
    label?: string
  }
  loading?: boolean
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  loading,
  className,
}: StatCardProps) {
  const trendPositive = trend && trend.value > 0
  const trendNegative = trend && trend.value < 0

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-5 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {loading ? (
            <div className="h-8 flex items-center">
              <Spinner className="h-6 w-6 text-slate-400" />
            </div>
          ) : (
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          )}
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600">
            {icon}
          </div>
        )}
      </div>

      {trend && !loading && (
        <div className="mt-3 flex items-center gap-1.5">
          {trendPositive && (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          )}
          {trendNegative && (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              trendPositive && 'text-emerald-600',
              trendNegative && 'text-red-600',
              !trendPositive && !trendNegative && 'text-slate-600'
            )}
          >
            {trend.value > 0 ? '+' : ''}
            {trend.value}%
          </span>
          {trend.label && (
            <span className="text-xs text-slate-500">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  )
}

interface StatCardSkeletonProps {
  className?: string
}

export function StatCardSkeleton({ className }: StatCardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-5 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-8 flex items-center">
            <Spinner className="h-6 w-6 text-slate-400" />
          </div>
        </div>
        <div className="h-10 w-10 bg-slate-200 rounded-lg" />
      </div>
    </div>
  )
}
