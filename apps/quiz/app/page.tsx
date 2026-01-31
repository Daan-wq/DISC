"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function HomePage() {
    const router = useRouter()

    useEffect(() => {
        // Always redirect to login page
        // This is the entry point - users should always start at /login
        router.replace('/login')
    }, [router])

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <LoadingSpinner text="Doorverwijzen..." />
        </div>
    )
}
