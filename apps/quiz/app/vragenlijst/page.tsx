'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect /vragenlijst to /quiz (internal route name kept for technical reasons)
export default function VragenlijstPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/quiz')
  }, [router])

  return null
}
