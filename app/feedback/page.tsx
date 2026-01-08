'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type RatingKey =
  | 'user_friendly'
  | 'easy'
  | 'options_clear'
  | 'instructions_clear'
  | 'recognizable'
  | 'honest_representation'
  | 'trust_result'
  | 'profile_recognizable'
  | 'profile_explanation_clear'
  | 'presentation_structure_clear'
  | 'post_receipt_clarity'
  | 'recommend_to_others'

type SelectKey = 'delivery_preference' | 'length_preference'

type TextKey = 'good' | 'improve' | 'other'

type Responses = Partial<Record<RatingKey, number>> &
  Partial<Record<SelectKey, string>> &
  Partial<Record<TextKey, string>>

type Question =
  | {
      key: RatingKey
      type: 'rating'
      title: string
      help?: string
      required: boolean
    }
  | {
      key: SelectKey
      type: 'select'
      title: string
      help?: string
      required: boolean
      options: Array<{ value: string; label: string }>
    }
  | {
      key: TextKey
      type: 'text'
      title: string
      help?: string
      required: boolean
      placeholder?: string
    }

function isValidRating(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 10
}

function RatingInput({
  value,
  onChange,
}: {
  value: number | undefined
  onChange: (v: number) => void
}) {
  const buttons = Array.from({ length: 10 }, (_, i) => i + 1)
  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={
            'h-10 w-10 rounded-xl border-2 text-sm font-semibold transition-all ' +
            (value === n
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')
          }
          aria-pressed={value === n}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string | undefined
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="grid gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            'w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all ' +
            (value === o.value
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')
          }
          aria-pressed={value === o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function FeedbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const attemptId = searchParams.get('attempt_id')

  const questions: Question[] = useMemo(
    () => [
      {
        key: 'user_friendly',
        type: 'rating',
        title: 'Hoe gebruiksvriendelijk vond je de quiz?',
        help: '1 = niet gebruiksvriendelijk, 10 = heel gebruiksvriendelijk',
        required: true,
      },
      {
        key: 'easy',
        type: 'rating',
        title: 'Hoe makkelijk was het om te doen?',
        help: '1 = moeilijk, 10 = heel makkelijk',
        required: true,
      },
      {
        key: 'options_clear',
        type: 'rating',
        title: 'Waren de keuzes duidelijk?',
        help: '1 = onduidelijk, 10 = heel duidelijk',
        required: true,
      },
      {
        key: 'instructions_clear',
        type: 'rating',
        title: 'Waren de instructies duidelijk?',
        help: '1 = onduidelijk, 10 = heel duidelijk',
        required: true,
      },
      {
        key: 'recognizable',
        type: 'rating',
        title: 'In hoeverre kon je jezelf herkennen in de uitslag?',
        help: '1 = helemaal niet, 10 = volledig',
        required: true,
      },
      {
        key: 'delivery_preference',
        type: 'select',
        title: 'Hoe had je je uitslag het liefst willen ontvangen?',
        required: true,
        options: [
          { value: 'mail', label: 'Via e-mail' },
          { value: 'result_page', label: 'Op de uitslagpagina' },
          { value: 'both', label: 'Beide' },
        ],
      },
      {
        key: 'honest_representation',
        type: 'rating',
        title: 'Had je het gevoel dat je een eerlijke representatie van jezelf kon geven?',
        help: '1 = niet, 10 = volledig',
        required: true,
      },
      {
        key: 'trust_result',
        type: 'rating',
        title: 'In hoeverre vertrouw je de uitslag?',
        help: '1 = helemaal niet, 10 = volledig',
        required: true,
      },
      {
        key: 'profile_recognizable',
        type: 'rating',
        title: 'In hoeverre is je profiel herkenbaar voor je?',
        help: '1 = helemaal niet, 10 = volledig',
        required: true,
      },
      {
        key: 'profile_explanation_clear',
        type: 'rating',
        title: 'Hoe duidelijk vond je de uitleg van je profiel?',
        help: '1 = onduidelijk, 10 = heel duidelijk',
        required: true,
      },
      {
        key: 'presentation_structure_clear',
        type: 'rating',
        title: 'Hoe duidelijk vond je de opbouw en presentatie van de uitslag?',
        help: '1 = onduidelijk, 10 = heel duidelijk',
        required: true,
      },
      {
        key: 'post_receipt_clarity',
        type: 'rating',
        title: 'Hoe duidelijk was het wat je na de quiz moest doen (rapport openen, mail, etc.)?',
        help: '1 = onduidelijk, 10 = heel duidelijk',
        required: true,
      },
      {
        key: 'recommend_to_others',
        type: 'rating',
        title: 'Hoe waarschijnlijk is het dat je deze quiz zou aanraden aan anderen?',
        help: '1 = niet, 10 = heel waarschijnlijk',
        required: true,
      },
      {
        key: 'length_preference',
        type: 'select',
        title: 'Hoe vond je de lengte van de quiz?',
        required: true,
        options: [
          { value: 'too_short', label: 'Te kort' },
          { value: 'good', label: 'Precies goed' },
          { value: 'too_long', label: 'Te lang' },
        ],
      },
      {
        key: 'good',
        type: 'text',
        title: 'Wat vond je goed?',
        required: false,
        placeholder: 'Bijvoorbeeld: de vragen, het ontwerp, de uitleg, ...',
      },
      {
        key: 'improve',
        type: 'text',
        title: 'Wat kan er beter?',
        required: false,
        placeholder: 'Bijvoorbeeld: duidelijkheid, volgorde, timing, ...',
      },
      {
        key: 'other',
        type: 'text',
        title: 'Overige opmerkingen',
        required: false,
        placeholder: 'Alles wat je verder nog kwijt wilt',
      },
    ],
    []
  )

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [step, setStep] = useState(0)
  const [responses, setResponses] = useState<Responses>({})

  const current = questions[step]

  useEffect(() => {
    let cancelled = false

    async function loadExisting() {
      try {
        if (!attemptId) {
          setLoading(false)
          return
        }

        const { data: sessionRes } = await supabase.auth.getSession()
        const token = sessionRes.session?.access_token
        if (!token) {
          setLoading(false)
          return
        }

        const res = await fetch(`/api/feedback/get?attempt_id=${encodeURIComponent(attemptId)}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          setLoading(false)
          return
        }

        const j = await res.json()
        const item = j?.item
        if (item?.responses && typeof item.responses === 'object') {
          if (!cancelled) setResponses(item.responses as Responses)
        }

        if (item?.id) {
          if (!cancelled) setSubmitted(true)
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadExisting()
    return () => {
      cancelled = true
    }
  }, [attemptId])

  const totalSteps = questions.length

  const missingRequired = useMemo(() => {
    const missing: string[] = []
    for (const q of questions) {
      if (!q.required) continue
      if (q.type === 'rating') {
        if (!isValidRating(responses[q.key])) missing.push(q.key)
      } else if (q.type === 'select') {
        if (!responses[q.key] || String(responses[q.key]).trim() === '') missing.push(q.key)
      } else if (q.type === 'text') {
        if (!responses[q.key] || String(responses[q.key]).trim() === '') missing.push(q.key)
      }
    }
    return missing
  }, [questions, responses])

  const canGoNext = useMemo(() => {
    if (!current) return false
    if (!current.required) return true
    if (current.type === 'rating') return isValidRating(responses[current.key])
    if (current.type === 'select') return !!responses[current.key]
    if (current.type === 'text') return !!responses[current.key]?.trim()
    return true
  }, [current, responses])

  const handleSubmit = async () => {
    if (!attemptId) return

    if (missingRequired.length > 0) {
      toast({
        title: 'Niet compleet',
        description: 'Vul alle verplichte vragen in voordat je afrondt.',
      })
      return
    }

    setSubmitting(true)
    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      const token = sessionRes.session?.access_token
      if (!token) {
        toast({ title: 'Niet ingelogd', description: 'Log opnieuw in en probeer het nog eens.' })
        return
      }

      const res = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attempt_id: attemptId,
          responses,
        }),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || 'Feedback opslaan mislukt')
      }

      setSubmitted(true)
      toast({ title: 'Bedankt', description: 'Je feedback is opgeslagen.' })
    } catch (e: any) {
      toast({
        title: 'Opslaan mislukt',
        description: e?.message || 'Er is een fout opgetreden.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const goBackToReport = () => {
    if (attemptId) {
      router.push(`/rapport/preview?attempt_id=${encodeURIComponent(attemptId)}`)
    } else {
      router.push('/quiz')
    }
  }

  if (!attemptId) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">Geen rapport ID gevonden. Open de feedback pagina via je rapport.</p>
              <Button onClick={() => router.push('/quiz')} variant="outline">
                Naar de quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-10 flex items-center justify-center">
              <Spinner className="h-8 w-8 text-slate-500" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Bedankt voor je feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                We gebruiken je feedback om de quiz en het rapport te verbeteren.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={goBackToReport}>
                  Terug naar rapport
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false)
                    setStep(0)
                  }}
                >
                  Feedback aanpassen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Feedback</h1>
            <p className="text-sm text-slate-600 mt-1">Stap {step + 1} van {totalSteps}</p>
          </div>
          <Button variant="outline" onClick={goBackToReport}>
            Terug
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{current.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {current.help ? <p className="text-sm text-slate-600">{current.help}</p> : null}

            {current.type === 'rating' ? (
              <RatingInput
                value={responses[current.key] as number | undefined}
                onChange={(v) => setResponses((prev) => ({ ...prev, [current.key]: v }))}
              />
            ) : null}

            {current.type === 'select' ? (
              <SelectInput
                value={responses[current.key] as string | undefined}
                onChange={(v) => setResponses((prev) => ({ ...prev, [current.key]: v }))}
                options={current.options}
              />
            ) : null}

            {current.type === 'text' ? (
              <Input
                value={(responses[current.key] as string | undefined) || ''}
                onChange={(e) => setResponses((prev) => ({ ...prev, [current.key]: e.target.value }))}
                placeholder={current.placeholder}
              />
            ) : null}

            {current.required ? (
              <p className="text-xs text-slate-500">Verplicht</p>
            ) : (
              <p className="text-xs text-slate-500">Optioneel</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                Vorige
              </Button>

              {step < totalSteps - 1 ? (
                <Button
                  onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
                  disabled={!canGoNext}
                >
                  Volgende
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting || missingRequired.length > 0}>
                  {submitting ? 'Opslaan...' : 'Feedback afronden'}
                </Button>
              )}

              {step === totalSteps - 1 && missingRequired.length > 0 ? (
                <p className="text-xs text-slate-500 self-center">
                  Vul eerst alle verplichte vragen in.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
