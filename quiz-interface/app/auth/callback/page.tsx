"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

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
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center border-t-4 border-red-500">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Inloglink verlopen</h1>
            <p className="text-sm text-gray-500">De inloglink is niet meer geldig</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-gray-700 text-sm leading-relaxed">
              De inloglink die je hebt gebruikt is verlopen of is al gebruikt. Inloglinks zijn maar 1 keer geldig en verlopen na 1 uur.
            </p>
          </div>
          <p className="text-gray-600 mb-6 text-sm">
            Vraag een nieuwe link aan door opnieuw in te loggen, of neem{" "}
            <a 
              href="https://tlcprofielen.nl/contact/" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800 font-medium"
            >
              contact
            </a>
            {" "}op met de beheerder als het probleem aanhoudt.
          </p>
          <button
            onClick={handleBackToLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            Nieuwe inloglink aanvragen
          </button>
          <p className="text-xs text-gray-500 mt-4">
            Tip: Je kunt ook Enter of Escape drukken om terug te gaan
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Bezig met inloggen…</h1>
        <p className="text-gray-600">Een moment geduld alstublieft.</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Bezig met inloggen…</h1>
          <p className="text-gray-600">Een moment geduld alstublieft.</p>
        </div>
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  )
}
