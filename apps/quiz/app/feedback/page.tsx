'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface FeedbackFormData {
  q1: number | null
  q2: number | null
  q3: number | null
  q4: number | null
  q5: number | null
  q6: string
}

const questions = [
  {
    id: 'q1',
    text: 'Hoe persoonlijk vond je de mail waarin je werd uitgenodigd om je vragenlijst in te vullen?',
    lowLabel: 'Helemaal niet persoonlijk',
    highLabel: 'Heel erg persoonlijk',
  },
  {
    id: 'q2',
    text: 'Hoe duidelijk vond je de instructies voorafgaand aan de vragenlijst?',
    lowLabel: 'Heel moeilijk/onduidelijk',
    highLabel: 'Super makkelijk en overzichtelijk',
  },
  {
    id: 'q3',
    text: 'Hoe prettig vond je het om de vragenlijst in te vullen?',
    lowLabel: 'Heel onprettig',
    highLabel: 'Heel prettig',
  },
  {
    id: 'q4',
    text: 'In welke mate herkende je jezelf in de uitkomsten?',
    lowLabel: 'Helemaal niet',
    highLabel: 'Volledig',
  },
  {
    id: 'q5',
    text: 'In hoeverre heb je behoefte aan meer uitleg?',
    lowLabel: 'Helemaal niet',
    highLabel: 'Heel erg veel behoefte',
  },
]

function ScaleInput({ 
  value, 
  onChange, 
  lowLabel, 
  highLabel 
}: { 
  value: number | null
  onChange: (v: number) => void
  lowLabel: string
  highLabel: string
}) {
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
      <div className="flex gap-1 sm:gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`
              flex-1 py-2 sm:py-3 text-sm sm:text-base font-medium rounded-lg border-2 transition-all
              ${value === n 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
              }
            `}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FeedbackPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FeedbackFormData>({
    q1: null,
    q2: null,
    q3: null,
    q4: null,
    q5: null,
    q6: '',
  })

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login?redirect=/feedback')
        return
      }
      setUser(user)
      setLoading(false)
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate all scale questions are answered
    if (!formData.q1 || !formData.q2 || !formData.q3 || !formData.q4 || !formData.q5) {
      setError('Beantwoord alsjeblieft alle vragen met een score.')
      return
    }

    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Get candidate info
      const { data: candidate } = await supabase
        .from('candidates')
        .select('full_name, middle_name')
        .eq('user_id', user.id)
        .single()

      const fullName = candidate?.middle_name 
        ? `${candidate.full_name?.split(' ')[0] || ''} ${candidate.middle_name} ${candidate.full_name?.split(' ').slice(1).join(' ') || ''}`.trim()
        : candidate?.full_name || user.email?.split('@')[0] || 'Gebruiker'

      // Get latest attempt
      const { data: attempt } = await supabase
        .from('quiz_attempts')
        .select('id')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          attempt_id: attempt?.id,
          full_name: fullName,
          email: user.email,
          q1_personal_email: formData.q1,
          q2_clear_instructions: formData.q2,
          q3_pleasant_experience: formData.q3,
          q4_self_recognition: formData.q4,
          q5_need_explanation: formData.q5,
          q6_comments: formData.q6 || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Er ging iets mis')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Er ging iets mis bij het versturen')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Bedankt voor je feedback!</h1>
            <p className="text-gray-600 mb-6">
              Je feedback helpt ons om de DISC vragenlijst te verbeteren.
            </p>
            <p className="text-gray-500 text-sm">
              Met vriendelijke groet,<br />
              Esther en Daan
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Dank je wel voor het deelnemen aan de testgroep van TLC Profielen!
            </h1>
            <p className="text-gray-600">
              In ruil voor jouw profiel stellen we je graag een aantal vragen over het proces dat je hebt doorlopen om jouw uitkomsten te ontvangen. Fijn dat je even de tijd neemt om deze te beantwoorden.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {questions.map((q, idx) => (
              <div key={q.id} className="border-b border-gray-100 pb-6 last:border-0">
                <label className="block text-gray-900 font-medium mb-1">
                  {idx + 1}. {q.text}
                </label>
                <ScaleInput
                  value={formData[q.id as keyof FeedbackFormData] as number | null}
                  onChange={(v) => setFormData(prev => ({ ...prev, [q.id]: v }))}
                  lowLabel={q.lowLabel}
                  highLabel={q.highLabel}
                />
              </div>
            ))}

            <div>
              <label className="block text-gray-900 font-medium mb-2">
                6. Welke opmerkingen en/of tips heb je voor ons?
              </label>
              <textarea
                value={formData.q6}
                onChange={(e) => setFormData(prev => ({ ...prev, q6: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Je opmerkingen of tips (optioneel)"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Versturen...' : 'Verstuur feedback'}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-500 text-sm">
            Dank je wel voor je medewerking!<br />
            Esther en Daan
          </p>
        </div>
      </div>
    </div>
  )
}
