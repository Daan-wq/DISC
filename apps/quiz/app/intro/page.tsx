'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function IntroPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [candidateName, setCandidateName] = useState<string>('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      setUser(user)

      // Get candidate name if exists
      const { data: candidate } = await supabase
        .from('candidates')
        .select('full_name, middle_name')
        .eq('user_id', user.id)
        .single()

      if (candidate?.full_name) {
        const firstName = candidate.full_name.split(' ')[0]
        setCandidateName(firstName)
      } else {
        setCandidateName(user.email?.split('@')[0] || '')
      }

      setLoading(false)
    }
    checkAuth()
  }, [router])

  const handleStart = () => {
    router.push('/vragenlijst')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <LoadingSpinner text="Laden..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src="https://lsfhegbphxdapjodmjua.supabase.co/storage/v1/object/public/Images/TLC-3.png" 
              alt="TLC Profielen" 
              className="h-16 sm:h-20"
            />
          </div>

          {/* Welcome */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Welkom{candidateName ? `, ${candidateName}` : ''}!
            </h1>
            <p className="text-lg text-gray-600">
              Je staat op het punt om de DISC vragenlijst in te vullen.
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Tijdsduur</h3>
              </div>
              <p className="text-gray-600 text-sm">
                De vragenlijst duurt ongeveer <strong>10-15 minuten</strong>.
              </p>
            </div>

            <div className="bg-green-50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Geen goede of foute antwoorden</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Beantwoord de vragen op basis van je eerste ingeving.
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h2 className="font-semibold text-gray-900 mb-3">Hoe werkt het?</h2>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">1.</span>
                Je krijgt 48 stellingen te zien met elk 4 uitspraken.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">2.</span>
                Kies bij elke stelling welke uitspraak het <strong>meest</strong> en welke het <strong>minst</strong> op jou van toepassing is.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">3.</span>
                Na afloop ontvang je direct je persoonlijke DISC profiel.
              </li>
            </ul>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="w-full py-4 px-6 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Start de vragenlijst
          </button>

          <p className="text-center text-gray-500 text-sm mt-6">
            Je voortgang wordt automatisch opgeslagen.
          </p>
        </div>
      </div>
    </div>
  )
}
