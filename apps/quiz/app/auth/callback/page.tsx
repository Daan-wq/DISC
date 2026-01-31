"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { LoadingSpinner } from "@/components/LoadingSpinner"

function AuthCallbackInner() {
    const router = useRouter()
    const params = useSearchParams()
    const [error, setError] = useState<boolean>(false)

    useEffect(() => {
        let redirected = false

        // Check for Supabase errors in URL hash (e.g., #error=access_denied&error_code=otp_expired)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const errorCode = hashParams.get('error_code')

        if (errorCode === 'otp_expired' || errorCode === 'access_denied') {
            console.log('Auth error:', errorCode)
            setError(true)
            return
        }

        const handleRedirect = (session: unknown) => {
            if (redirected) return
            redirected = true

            if (session) {
                const redirect = params.get("redirect") || "/quiz"
                console.log('Auth callback: redirecting to', redirect)
                router.replace(redirect)
            } else {
                console.log('Auth callback: no session, redirecting to login')
            }
        }

        // Listen for auth state changes (magic link creates session via hash fragment)
        // Note: Clock skew warnings from Supabase Auth are non-blocking and can be ignored
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change:', event, !!session)

            if (event === 'SIGNED_IN' && session) {
                handleRedirect(session)
            }
        })

        // Also check current session immediately
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('Initial session check:', !!session)

            if (session) {
                handleRedirect(session)
            } else {
                // Give it 3 seconds for the magic link to process
                setTimeout(() => {
                    supabase.auth.getSession().then(({ data: { session: retrySession } }) => {
                        console.log('Retry session check:', !!retrySession)
                        handleRedirect(retrySession)
                    })
                }, 3000)
            }
        })

        return () => {
            authListener?.subscription.unsubscribe()
        }
    }, [])

    const handleBackToLogin = () => {
        router.push("/login")
    }

    // Keyboard navigation: Enter or Escape to go back to login
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (error && (e.key === 'Enter' || e.key === 'Escape')) {
                e.preventDefault()
                handleBackToLogin()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [error])

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4">
                <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
                    <div className="mb-4">
                        <h1 className="text-2xl font-bold text-red-600">Inloglink verlopen</h1>
                    </div>
                    <p className="text-gray-600 mb-6">
                        De inloglink is verlopen. Vraag een nieuwe link aan door opnieuw in te loggen, of neem{" "}
                        <a
                            href="https://tlcprofielen.nl/contact/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline hover:text-blue-800"
                        >
                            contact
                        </a>
                        {" "}op met de beheerder.
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                        Tip: Druk op Enter of Escape om terug te gaan.
                    </p>
                    <button
                        onClick={handleBackToLogin}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
                    >
                        Terug naar inloggen
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <LoadingSpinner text="Inloggen..." />
        </div>
    )
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LoadingSpinner text="Inloggen..." />
            </div>
        }>
            <AuthCallbackInner />
        </Suspense>
    )
}
