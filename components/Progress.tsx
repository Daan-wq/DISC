'use client'

interface ProgressProps {
  current: number
  total: number
}

export default function Progress({ current, total }: ProgressProps) {
  const percentage = (current / total) * 100
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
      <div 
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
      <p className="text-sm text-gray-600 mt-3">
        Vraag {current} van {total}
      </p>
    </div>
  )
}
