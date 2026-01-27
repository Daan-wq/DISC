"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
    const router = useRouter()

    useEffect(() => {
        // Always redirect to login page
        // This is the entry point - users should always start at /login
        router.replace('/login')
    }, [router])

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Bezig met laden...</h1>
            </div>
        </div>
    )
}
