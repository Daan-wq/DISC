"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function QuizLandingPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const quizId = (params?.id || "").toString()
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      // Auth guard: redirect to login if not authenticated
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        const redirect = encodeURIComponent(`/quiz/${quizId}`)
        router.replace(`/login?redirect=${redirect}`)
        return
      }
      if (!mounted) return
      setUserEmail(data.user.email ?? null)
      setCheckingAuth(false)
    })()
    return () => { mounted = false }
  }, [router, quizId])

  async function startQuiz() {
    setError(null)
    setLoading(true)
    try {
      // DB-first authorization: let the DB decide via RLS if the insert is allowed
      const { data, error } = await supabase
        .from("quiz_attempts")
        .insert({ quiz_id: quizId })
        .select("id")
        .single()

      if (error) {
        // Friendly messages
        const code = (error as any).code
        if (code === "23505") {
          setError("Je hebt deze quiz al gestart. Je kunt niet opnieuw beginnen.")
        } else if (code === "PGRST302") {
          setError("Geen toegang voor deze quiz (niet op de lijst of verlopen).")
        } else if (code === "PGRST301") {
          setError("Inloggen vereist. Ga naar de inlogpagina.")
        } else {
          setError(error.message || "Er ging iets mis bij het starten.")
        }
        return
      }

      // Success → persist attempt info and go to the existing quiz UI
      if (data?.id) {
        try {
          localStorage.setItem('quizAttemptId', data.id)
          localStorage.setItem('quizId', quizId)
        } catch {}
      }
      router.replace("/quiz")
    } catch (e: any) {
      setError(e?.message || "Onbekende fout")
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Bezig met laden...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-2">Start de quiz</h1>
        <p className="text-gray-600 mb-6">Toegang wordt in de database gecontroleerd. Je kunt de quiz maar één keer starten.</p>

        <div className="mb-4 text-sm text-gray-500">
          {userEmail ? (
            <span>Ingelogd als: {userEmail}</span>
          ) : (
            <span>Niet ingelogd</span>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <button
          onClick={startQuiz}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Bezig…" : "Start quiz"}
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Tip: Als je geen toegang hebt, vraag je beheerder om je e-mailadres op de allowlist te zetten.
        </p>
      </div>
    </div>
  )
}
