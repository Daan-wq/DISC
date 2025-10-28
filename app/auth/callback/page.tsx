"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

function AuthCallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [error] = useState<string | null>(null)

  useEffect(() => {
    let redirected = false

    const handleRedirect = (session: unknown) => {
      if (redirected) return
      redirected = true
      
      if (session) {
        const redirect = params.get("redirect") || "/quiz"
        console.log('Auth callback: redirecting to', redirect)
        router.replace(redirect)
      } else {
        console.log('Auth callback: no session, redirecting to login')
        router.replace("/login")
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error === "no_access") {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Inloggen mislukt</h1>
          <p className="text-sm text-red-600 mb-2">U heeft (nog) geen toegang tot de test.</p>
          <p className="text-sm text-gray-600">
            Neem eventueel{" "}
            <a 
              href="https://tlcprofielen.nl/contact/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              contact
            </a>
            {" "}op met support.
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
