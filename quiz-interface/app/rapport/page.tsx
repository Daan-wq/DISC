import { Suspense } from "react"
import { RapportContent } from "@/components/rapport-content"
import { Skeleton } from "@/components/ui/skeleton"

function RapportLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <Skeleton className="h-12 w-48 mb-4" />
        <Skeleton className="h-32 w-full mb-8" />
        <Skeleton className="h-96 w-full mb-8" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  )
}

export default function RapportPage() {
  return (
    <Suspense fallback={<RapportLoading />}>
      <RapportContent />
    </Suspense>
  )
}
