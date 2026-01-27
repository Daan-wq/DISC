'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Step = 'intro' | 'form' | 'thanks' | 'error'

type FormState = {
  q1_personal: number | null
  q2_instructions: number | null
  q3_pleasant: number | null
  q4_recognizable: number | null
  q5_need_more_explanation: number | null
  q6_notes: string
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-900">{label}</div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 11 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={
              'h-9 w-9 rounded-md border text-sm font-semibold transition-colors ' +
              (value === i
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')
            }
            aria-pressed={value === i}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>0 = helemaal niet</span>
        <span>10 = helemaal wel</span>
      </div>
    </div>
  )
}

export default function FeedbackPage() {
  const router = useRouter()
  const search = useSearchParams()

  const attemptId = useMemo(() => (search.get('attempt_id') || '').trim(), [search])

  const [step, setStep] = useState<Step>('intro')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    q1_personal: null,
    q2_instructions: null,
    q3_pleasant: null,
    q4_recognizable: null,
    q5_need_more_explanation: null,
    q6_notes: '',
  })

  useEffect(() => {
    if (!attemptId) {
      setStep('error')
      setError('Ontbrekende attempt_id in de URL.')
      return
    }
  }, [attemptId])

  const canSubmit =
    form.q1_personal !== null &&
    form.q2_instructions !== null &&
    form.q3_pleasant !== null &&
    form.q4_recognizable !== null &&
    form.q5_need_more_explanation !== null

  async function submit() {
    if (!attemptId) {
      setError('Ontbrekende attempt_id.')
      return
    }
    if (!canSubmit) {
      setError('Vul alle scores (0–10) in voordat je verstuurt.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      const token = sessionRes.session?.access_token
      if (!token) {
        setError('Je sessie is verlopen. Log opnieuw in.')
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
          q1_personal: form.q1_personal,
          q2_instructions: form.q2_instructions,
          q3_pleasant: form.q3_pleasant,
          q4_recognizable: form.q4_recognizable,
          q5_need_more_explanation: form.q5_need_more_explanation,
          q6_notes: form.q6_notes.trim() || null,
        }),
      })

      const j = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        const msg = (j as any)?.error
        setError(typeof msg === 'string' && msg ? msg : 'Opslaan mislukt.')
        return
      }

      setStep('thanks')
    } catch (e: any) {
      setError(e?.message || 'Opslaan mislukt.')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-3 text-red-600">Feedback niet beschikbaar</h1>
          <p className="text-gray-700 mb-6">{error || 'Er ging iets mis.'}</p>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={() => router.push('/login')}
          >
            Terug naar login
          </button>
        </div>
      </div>
    )
  }

  if (step === 'thanks') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-3">Bedankt!</h1>
          <p className="text-gray-700 mb-6">Je feedback is opgeslagen. Dankjewel voor je deelname.</p>
          <a
            href="https://tlcprofielen.nl/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Naar TLC Profielen
          </a>
        </div>
      </div>
    )
  }

  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-3">Korte vragenlijst</h1>
          <p className="text-gray-700 mb-6">
            Je zit in de testgroep. Met deze vragen help je ons de DISC quiz te verbeteren.
          </p>
          <button
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
            onClick={() => setStep('form')}
          >
            Start
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-2">Feedback</h1>
        <p className="text-sm text-gray-600 mb-6">Geef per vraag een score van 0 t/m 10.</p>

        <div className="space-y-6">
          <RatingRow
            label="1. Hoe persoonlijk vond je de rapportage?"
            value={form.q1_personal}
            onChange={(v) => setForm((f) => ({ ...f, q1_personal: v }))}
          />
          <RatingRow
            label="2. Waren de instructies duidelijk?"
            value={form.q2_instructions}
            onChange={(v) => setForm((f) => ({ ...f, q2_instructions: v }))}
          />
          <RatingRow
            label="3. Was het prettig om de vragen te maken?"
            value={form.q3_pleasant}
            onChange={(v) => setForm((f) => ({ ...f, q3_pleasant: v }))}
          />
          <RatingRow
            label="4. Waren de stellingen herkenbaar?"
            value={form.q4_recognizable}
            onChange={(v) => setForm((f) => ({ ...f, q4_recognizable: v }))}
          />
          <RatingRow
            label="5. Had je behoefte aan meer uitleg?"
            value={form.q5_need_more_explanation}
            onChange={(v) => setForm((f) => ({ ...f, q5_need_more_explanation: v }))}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">6. Opmerkingen (optioneel)</label>
            <textarea
              value={form.q6_notes}
              onChange={(e) => setForm((f) => ({ ...f, q6_notes: e.target.value }))}
              className="w-full h-28 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Wat kunnen we verbeteren?"
              maxLength={5000}
            />
          </div>

          {error && <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

          <button
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={submit}
            disabled={busy}
          >
            {busy ? 'Bezig...' : 'Versturen'}
          </button>
        </div>
      </div>
    </div>
  )
}
