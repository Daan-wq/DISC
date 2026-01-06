'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Progress from '@/components/Progress'
import ErrorWall from '@/components/ErrorWall'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { type PersonalData, type QuizAnswer } from '@/lib/schema'
import { supabase } from '@/lib/supabase'
import { submitAnswers } from '@/lib/answers'
import { QUIZ_ID } from '@/lib/constants'

// DISC statements for quiz interface
const statements: Statement[] = [
  { id: 1, text: "Ik houd rekening met anderen", discOrder: ['S', 'I', 'C', 'D'] },
  { id: 2, text: "Ik ben levendig", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 3, text: "Ik leg de lat hoog voor mezelf", discOrder: ['C', 'D', 'S', 'I'] },
  { id: 4, text: "Ik houd van uitdagingen", discOrder: ['D', 'I', 'C', 'S'] },
  { id: 5, text: "Ik werk graag samen", discOrder: ['I', 'S', 'D', 'C'] },
  { id: 6, text: "Ik ben bedachtzaam", discOrder: ['C', 'S', 'D', 'I'] },
  { id: 7, text: "Ik ben vastbesloten", discOrder: ['D', 'C', 'I', 'S'] },
  { id: 8, text: "Ik ben vriendelijk tegen anderen", discOrder: ['S', 'I', 'C', 'D'] },
  { id: 9, text: "Ik weet wat mensen willen", discOrder: ['C', 'D', 'S', 'I'] },
  { id: 10, text: "Ik ben een durfal", discOrder: ['D', 'I', 'C', 'S'] },
  { id: 11, text: "Ik ben meelevend, empathisch", discOrder: ['S', 'I', 'C', 'D'] },
  { id: 12, text: "Ik overtuig anderen met mijn charme", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 13, text: "Ik houd van nieuwe ideeën en plannen", discOrder: ['D', 'I', 'C', 'S'] },
  { id: 14, text: "Ik ga conflicten uit de weg", discOrder: ['I', 'S', 'D', 'C'] },
  { id: 15, text: "Ik blijf bij mijn beslissing", discOrder: ['C', 'D', 'S', 'I'] },
  { id: 16, text: "Ik werk het liefst door tot een taak af is", discOrder: ['S', 'C', 'I', 'D'] },
  { id: 17, text: "Ik ben enthousiast", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 18, text: "Ik doe dingen zorgvuldig", discOrder: ['C', 'S', 'D', 'I'] },
  { id: 19, text: "Ik heb moed en lef", discOrder: ['D', 'I', 'C', 'S'] },
  { id: 20, text: "Ik word niet snel boos", discOrder: ['S', 'C', 'I', 'D'] },
  { id: 21, text: "Ik houd van competitie en wil winnen", discOrder: ['D', 'C', 'I', 'S'] },
  { id: 22, text: "Ik denk aan de gevoelens van andere mensen", discOrder: ['S', 'I', 'C', 'D'] },
  { id: 23, text: "Ik ben zorgeloos in mijn handelen", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 24, text: "Ik ben soms gereserveerd", discOrder: ['C', 'S', 'D', 'I'] },
  { id: 25, text: "Ik ben nauwkeurig", discOrder: ['C', 'S', 'D', 'I'] },
  { id: 26, text: "Ik ben volgzaam", discOrder: ['S', 'C', 'I', 'D'] },
  { id: 27, text: "Ik wil graag de beste zijn", discOrder: ['D', 'C', 'I', 'S'] },
  { id: 28, text: "Ik maak graag plezier bij de dingen die ik doe", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 29, text: "Ik ben volhardend, vasthoudend, dapper", discOrder: ['D', 'C', 'I', 'S'] },
  { id: 30, text: "Ik kan anderen goed overtuigen", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 31, text: "Ik ga niet snel in discussie", discOrder: ['S', 'I', 'C', 'D'] },
  { id: 32, text: "Ik stel vaak vragen, ben bedachtzaam", discOrder: ['C', 'S', 'D', 'I'] },
  { id: 33, text: "Ik ben hartelijk en gezellig", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 34, text: "Ik ben rustig en geduldig", discOrder: ['S', 'C', 'I', 'D'] },
  { id: 35, text: "Ik ben onafhankelijk", discOrder: ['D', 'C', 'I', 'S'] },
  { id: 36, text: "Ik ben nauwkeurig en analytisch", discOrder: ['C', 'S', 'D', 'I'] },
  { id: 37, text: "Ik daag mezelf graag uit", discOrder: ['D', 'C', 'I', 'S'] },
  { id: 38, text: "Ik beslis nadat ik alle feiten ken", discOrder: ['C', 'S', 'D', 'I'] },
  { id: 39, text: "Ik kan me laten beïnvloeden door andere meningen", discOrder: ['I', 'S', 'D', 'C'] },
  { id: 40, text: "Ik doe dingen op een rustige manier", discOrder: ['S', 'C', 'I', 'D'] },
  { id: 41, text: "Ik houd van interactie met anderen", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 42, text: "Ik zeg niet snel wat mijn gevoelens zijn", discOrder: ['S', 'C', 'I', 'D'] },
  { id: 43, text: "Ik wil details en feiten horen", discOrder: ['C', 'D', 'S', 'I'] },
  { id: 44, text: "Ik besluit snel", discOrder: ['D', 'I', 'C', 'S'] },
  { id: 45, text: "Ik ben een entertainer", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 46, text: "Ik neem gemakkelijk risico's", discOrder: ['D', 'I', 'C', 'S'] },
  { id: 47, text: "Ik ben discreet", discOrder: ['C', 'S', 'D', 'I'] },
  { id: 48, text: "Ik help anderen graag", discOrder: ['S', 'I', 'C', 'D'] },
  { id: 49, text: "Ik ben krachtig in mijn handelen", discOrder: ['D', 'I', 'C', 'S'] },
  { id: 50, text: "Ik ben extravert", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 51, text: "Ik kan goed samenwerken", discOrder: ['S', 'I', 'C', 'D'] },
  { id: 52, text: "Ik wil geen fouten maken", discOrder: ['C', 'S', 'D', 'I'] },
  { id: 53, text: "Ik werk met een planning", discOrder: ['C', 'S', 'D', 'I'] },
  { id: 54, text: "Ik doe dingen op mijn manier", discOrder: ['D', 'C', 'I', 'S'] },
  { id: 55, text: "Ik houd graag iedereen tevreden", discOrder: ['I', 'S', 'D', 'C'] },
  { id: 56, text: "Ik ben vriendelijk en geduldig", discOrder: ['S', 'C', 'I', 'D'] },
  { id: 57, text: "Ik ondersteun anderen graag", discOrder: ['S', 'I', 'C', 'D'] },
  { id: 58, text: "Ik ben gericht op actie", discOrder: ['D', 'I', 'C', 'S'] },
  { id: 59, text: "Ik ben tactvol", discOrder: ['C', 'S', 'D', 'I'] },
  { id: 60, text: "Ik toon mijn gevoelens makkelijk", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 61, text: "Ik vertrouw anderen snel", discOrder: ['I', 'S', 'D', 'C'] },
  { id: 62, text: "Ik ben begripvol naar mijn omgeving", discOrder: ['S', 'I', 'C', 'D'] },
  { id: 63, text: "Ik ben een rationele denker", discOrder: ['C', 'D', 'S', 'I'] },
  { id: 64, text: "Ik heb veel zelfvertrouwen", discOrder: ['D', 'I', 'C', 'S'] },
  { id: 65, text: "Ik houd van logische methodes", discOrder: ['D', 'C', 'I', 'S'] },
  { id: 66, text: "Ik volg bewezen werkwijzen", discOrder: ['C', 'S', 'D', 'I'] },
  { id: 67, text: "Ik ben actief, levenslustig", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 68, text: "Ik ben een doorzetter", discOrder: ['S', 'C', 'I', 'D'] },
  { id: 69, text: "Ik ben veeleisend voor mezelf en anderen", discOrder: ['C', 'D', 'S', 'I'] },
  { id: 70, text: "Ik werk gemakkelijk samen", discOrder: ['S', 'I', 'C', 'D'] },
  { id: 71, text: "Ik ben communicatief", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 72, text: "Ik heb een duidelijke eigen mening", discOrder: ['D', 'C', 'I', 'S'] },
  { id: 73, text: "Ik ben nieuwsgierig naar zaken", discOrder: ['C', 'D', 'S', 'I'] },
  { id: 74, text: "Ik ben resultaat- en doelgericht", discOrder: ['D', 'I', 'C', 'S'] },
  { id: 75, text: "Ik ben optimistisch van aard", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 76, text: "Ik ben tolerant en makkelijk in de omgang", discOrder: ['S', 'I', 'C', 'D'] },
  { id: 77, text: "Ik spreek anderen tegen als ik het er niet mee eens ben", discOrder: ['D', 'C', 'I', 'S'] },
  { id: 78, text: "Ik ga moeilijkheden het liefst uit de weg", discOrder: ['S', 'I', 'C', 'D'] },
  { id: 79, text: "Ik kom introvert over", discOrder: ['C', 'S', 'D', 'I'] },
  { id: 80, text: "Ik ben spontaan", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 81, text: "Ik krijg energie door contact met anderen", discOrder: ['I', 'D', 'S', 'C'] },
  { id: 82, text: "Ik houd van voorspelbaarheid", discOrder: ['S', 'C', 'I', 'D'] },
  { id: 83, text: "Ik ben zelfverzekerd", discOrder: ['D', 'I', 'C', 'S'] },
  { id: 84, text: "Ik maak me snel zorgen", discOrder: ['C', 'S', 'D', 'I'] },
  { id: 85, text: "Ik wil graag mensen om me heen", discOrder: ['I', 'S', 'D', 'C'] },
  { id: 86, text: "Ik ben nauwkeurig, correct en precies", discOrder: ['C', 'S', 'D', 'I'] },
  { id: 87, text: "Ik kom krachtig over", discOrder: ['D', 'I', 'C', 'S'] },
  { id: 88, text: "Ik ben gemakkelijk, meegaand", discOrder: ['S', 'I', 'C', 'D'] },
  { id: 89, text: "Ik ben open en direct in mijn communicatie", discOrder: ['D', 'I', 'C', 'S'] },
  { id: 90, text: "Ik maak analyses en zoek zaken uit", discOrder: ['C', 'D', 'S', 'I'] },
  { id: 91, text: "Ik zorg dat anderen zich fijn en comfortabel voelen", discOrder: ['I', 'S', 'D', 'C'] },
  { id: 92, text: "Ik ben ingetogen en sta open voor andere meningen", discOrder: ['S', 'C', 'I', 'D'] },
  { id: 93, text: "Ik ben gericht op resultaten en oplossingen", discOrder: ['D', 'C', 'I', 'S'] },
  { id: 94, text: "Ik doe graag taken zelf", discOrder: ['S', 'C', 'I', 'D'] },
  { id: 95, text: "Ik vind het belangrijk dat anderen me aardig vinden", discOrder: ['I', 'S', 'D', 'C'] },
  { id: 96, text: "Ik deel mijn persoonlijke gedachten niet snel", discOrder: ['C', 'S', 'D', 'I'] }
]

type Statement = {
  id: number
  text: string
  discOrder: string[]
}

function QuizInner() {
  const router = useRouter()
  const search = useSearchParams()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [allowCheck, setAllowCheck] = useState<null | boolean>(null)
  const [candidateId, setCandidateId] = useState<string | null>(null)
  const [personalData, setPersonalData] = useState<PersonalData | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showThankYou, setShowThankYou] = useState(false)
  const [noAccess, setNoAccess] = useState(false)
  const [candidateStatus, setCandidateStatus] = useState<'idle' | 'creating' | 'ready' | 'fatalError'>('idle')
  const [fatalDetails, setFatalDetails] = useState<{ code: string; message: string } | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [sessionTimeoutWarning, setSessionTimeoutWarning] = useState(false)
  const [sessionTimeoutSeconds, setSessionTimeoutSeconds] = useState(0)
  const [retryKey, setRetryKey] = useState(0)
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  // Performance: Track last saved state to prevent duplicate writes
  const lastSavedAnswersRef = useRef<string>('')
  const lastSavedQuestionRef = useRef<number>(-1)
  const saveCountRef = useRef({ answers: 0, progress: 0, heartbeat: 0, skipped: 0 })

  // Structured logger
  function logError(event: string, payload: Record<string, unknown>) {
    try {
      const time = new Date().toISOString()
      // Hash userId lightly to avoid leaking PII in logs (client-side non-cryptographic)
      const userId = payload.userId || 'unknown'
      const userHash = typeof userId === 'string' ? (userId.slice(0, 8) + '...') : 'unknown'
      console.error('[quiz]', event, JSON.stringify({ ...payload, time, userHash }))
    } catch {}
  }

  // Check maintenance mode (public endpoint, no auth required)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/public/maintenance-status')
        const data = await res.json()
        if (mounted) {
          setMaintenanceMode(data.enabled === true)
        }
      } catch (e) {
        console.error('Failed to check maintenance mode:', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Auth guard + legacy localStorage init
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (!data.user) {
          const redirect = encodeURIComponent('/quiz')
          router.replace(`/login?redirect=${redirect}`)
          return
        }
        // Always clear old candidate data and create fresh one
        // This prevents using stale/deleted candidates from localStorage
        try {
          console.log('[quiz] Clearing old localStorage data to create fresh candidate')
          localStorage.removeItem('candidateId')
          localStorage.removeItem('personalData')
          localStorage.removeItem('quizAttemptId')
          localStorage.removeItem('quizId')
        } catch (e) {
          console.error('[quiz] Error clearing localStorage:', e)
        }
      } finally {
        if (mounted) setCheckingAuth(false)
      }
    })()
    return () => { mounted = false }
  }, [router])

  // Allowlist pre-check: block access early if not eligible
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (checkingAuth) return
      try {
        const { data } = await supabase.auth.getUser()
        const email = data.user?.email?.toLowerCase().trim()
        if (!email) return

        const res = await fetch('/api/auth/allowlist-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })
        const j = await res.json().catch(() => ({ eligible: false }))
        if (!mounted) return
        if (j?.eligible) {
          setAllowCheck(true)
        } else {
          setAllowCheck(false)
          setNoAccess(true)
          // Redirect to no-access page with reason
          const reason = j?.reason === 'ALREADY_USED' ? 'used' : 'not-listed'
          try { router.replace(`/no-access?reason=${reason}`) } catch {}
        }
      } catch {
        // On error, be conservative: do not allow
        if (!mounted) return
        setAllowCheck(false)
        setNoAccess(true)
      }
    })()
    return () => { mounted = false }
  }, [checkingAuth, router])

  // Auto-create or fetch candidate row based on authenticated user via server API (idempotent)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (checkingAuth) return
      // Only proceed when allowlist is confirmed true
      if (allowCheck === false) return
      if (allowCheck !== true) return
      try {
        const { data } = await supabase.auth.getUser()
        const email = data.user?.email?.toLowerCase().trim()
        const userId = data.user?.id
        if (!email || !userId) return

        // If already set from localStorage, mark as ready and skip creation
        if (candidateId) {
          if (!mounted) return
          setCandidateStatus('ready')
          return
        }

        // Check if we have a quiz attempt already - if so, skip candidate creation
        const existingAttempt = typeof window !== 'undefined' ? localStorage.getItem('quizAttemptId') : null
        if (existingAttempt) {
          console.log('[candidate] Quiz attempt already exists, skipping candidate creation')
          // Load candidate data from localStorage if available
          const storedCandidateId = typeof window !== 'undefined' ? localStorage.getItem('candidateId') : null
          if (storedCandidateId) {
            setCandidateId(storedCandidateId)
          }
          const storedData = typeof window !== 'undefined' ? localStorage.getItem('personalData') : null
          if (storedData) {
            try {
              setPersonalData(JSON.parse(storedData))
            } catch {}
          }
          if (!mounted) return
          setCandidateStatus('ready')
          return
        }

        // Derive full name from URL params if present
        const fn = (search?.get('fn') || '').trim()
        const ln = (search?.get('ln') || '').trim()
        const combinedName = [fn, ln].filter(Boolean).join(' ').trim()
        const nameFromEmail = email.split('@')[0]
        const preferredName = combinedName || nameFromEmail

        // Get token for server API
        const { data: sessionRes } = await supabase.auth.getSession()
        const token = sessionRes.session?.access_token
        if (!token) {
          if (!mounted) return
          setCandidateStatus('fatalError')
          setFatalDetails({ code: 'NO_TOKEN', message: 'Geen sessietoken beschikbaar' })
          return
        }

        // Retry helper for network flakiness
        async function tryCreate(attempt: number): Promise<string | null> {
          // Call candidates API endpoint
          const res = await fetch('/api/candidates/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            // Do not send quizId; server uses single-quiz fallback
            body: JSON.stringify({ fullName: preferredName, email })
          })
          const j = await res.json().catch(() => ({}))
          if (res.ok && j?.candidateId) return j.candidateId as string
          
          // Retry on server errors
          if (attempt < 2 && (res.status >= 500 || j?.error?.code === 'UNHANDLED')) {
            await new Promise(r => setTimeout(r, 250 * Math.pow(2, attempt)))
            return tryCreate(attempt + 1)
          }
          logError('candidate_create_failed', { quizId: QUIZ_ID, userId, status: res.status, error: j?.error })
          if (!mounted) return null
          setFatalDetails({ code: j?.error?.code || 'CANDIDATE_CREATE_FAILED', message: j?.error?.message || 'Kon kandidaat niet aanmaken' })
          return null
        }

        const newId = await tryCreate(0)
        if (!mounted) return
        if (!newId) {
          setCandidateStatus('fatalError')
          return
        }

        setCandidateId(newId)
        setPersonalData({ fullName: preferredName, email, company: undefined })
        try {
          localStorage.setItem('candidateId', newId)
          localStorage.setItem('personalData', JSON.stringify({ fullName: preferredName, email }))
        } catch {}
        setCandidateStatus('ready')
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e)
        logError('candidate_init_exception', { quizId: QUIZ_ID, error: errorMessage })
        if (!mounted) return
        setCandidateStatus('fatalError')
        setFatalDetails({ code: 'INIT_EXCEPTION', message: errorMessage })
      }
    })()
    return () => { mounted = false }
  }, [checkingAuth, allowCheck, candidateId, search, retryKey])

  // In single-quiz mode, auto-create an attempt after user is authenticated AND candidate is ready.
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (checkingAuth) return
      // Only proceed when allowlist is confirmed true
      if (allowCheck === false) return
      if (allowCheck !== true) return
      if (candidateStatus !== 'ready' || !candidateId) return
      try {
        // Only proceed if authenticated
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return
        
        // Check if we already have a valid attempt in localStorage
        const existingAttempt = typeof window !== 'undefined' ? localStorage.getItem('quizAttemptId') : null
        const existingQuizId = typeof window !== 'undefined' ? localStorage.getItem('quizId') : null
        
        // If we have a stored attempt, verify it still exists in DB
        if (existingAttempt && existingQuizId) {
          console.log('[attempt] Found existing attempt in localStorage:', existingAttempt)
          const { data: found, error: checkErr } = await supabase
            .from('quiz_attempts')
            .select('id')
            .eq('id', existingAttempt)
            .maybeSingle()
          
          if (!checkErr && found) {
            console.log('[attempt] Verified existing attempt still exists, reusing:', existingAttempt)
            return
          } else {
            console.log('[attempt] Existing attempt no longer exists in DB, clearing and creating new one')
            try {
              localStorage.removeItem('quizAttemptId')
              localStorage.removeItem('quizId')
            } catch {}
          }
        }

        // Create attempt with hardcoded quiz ID (no lookup needed)
        let data, error
        try {
          const result = await supabase
            .from('quiz_attempts')
            .insert({ 
              quiz_id: QUIZ_ID,
              user_id: auth.user.id,
              started_at: new Date().toISOString()
            })
            .select('id, quiz_id')
            .single()
          data = result.data
          error = result.error
        } catch (e: any) {
          console.error('[attempt] Exception during insert:', e)
          error = e
        }

        if (error) {
          const code = (error as any).code
          
          // For any error (including 23505 duplicate), try the API endpoint which has service role
          try {
            const { data: sessionRes } = await supabase.auth.getSession()
            const apiToken = sessionRes.session?.access_token
            
            if (!apiToken) {
              console.error('[attempt] No auth token available')
              if (mounted) setNoAccess(true)
              return
            }
            
            const apiRes = await fetch('/api/quiz/attempt/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`
              }
            })
            
            if (apiRes.ok) {
              const apiData = await apiRes.json()
              if (mounted) {
                try {
                  localStorage.setItem('quizAttemptId', apiData.id)
                  localStorage.setItem('quizId', apiData.quiz_id)
                } catch (e) {
                  console.error('[attempt] Failed to store in localStorage:', e)
                }
              }
              return
            } else {
              console.error('[attempt] API fallback failed with status', apiRes.status)
              if (mounted) setNoAccess(true)
              return
            }
          } catch (fallbackErr) {
            console.error('[attempt] Exception in API fallback:', fallbackErr)
            if (mounted) setNoAccess(true)
            return
          }
          return
        }

        if (data?.id) {
          try {
            localStorage.setItem('quizAttemptId', data.id)
            localStorage.setItem('quizId', QUIZ_ID)
          } catch {}
        }
      } catch (e) {
        console.error('Attempt init error:', e)
      }
    })()
    return () => { mounted = false }
  }, [checkingAuth, allowCheck, candidateStatus, candidateId])

  // Load quiz progress (current question and previous answers) after attempt is ready
  useEffect(() => {
    let mounted = true

    const loadProgress = async () => {
      const attemptId = typeof window !== 'undefined' ? localStorage.getItem('quizAttemptId') : null
      if (!attemptId) {
        console.log('[progress] No attemptId in localStorage')
        return
      }

      try {
        const { data: sessionRes } = await supabase.auth.getSession()
        const token = sessionRes.session?.access_token
        if (!token) return

        console.log('[progress] Loading quiz progress for attempt:', attemptId)
        const res = await fetch('/api/quiz/attempt/get', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!res.ok) {
          console.error('[progress] Failed to load progress:', res.status)
          return
        }

        const data = await res.json()
        if (!data.attempt) {
          console.log('[progress] No attempt found')
          return
        }

        console.log('[progress] Loaded progress - current question:', data.attempt.current_question, 'answers:', data.answers?.length || 0)

        if (mounted) {
          // Set current question (1-indexed, but state is 0-indexed)
          const questionIndex = (data.attempt.current_question || 1) - 1
          console.log('[progress] Setting current question to index:', questionIndex)
          setCurrentQuestion(questionIndex)

          // Restore previous answers from raw_answers
          if (data.answers && data.answers.length > 0) {
            console.log('[progress] Raw answers from DB:', data.answers)
            
            // raw_answers can be:
            // 1. Direct array: ["A", "B", "C"]
            // 2. JSONB object: { answers: ["A", "B", "C"], timestamp: "..." }
            let answersArray: string[] = []
            
            if (Array.isArray(data.answers)) {
              // Format 1: direct array
              console.log('[progress] Format 1: Direct array')
              answersArray = data.answers
            } else if (typeof data.answers === 'object' && data.answers.answers && Array.isArray(data.answers.answers)) {
              // Format 2: JSONB object with answers property
              console.log('[progress] Format 2: JSONB object with answers property')
              answersArray = data.answers.answers
            } else {
              console.log('[progress] Unknown format:', typeof data.answers, data.answers)
            }
            
            console.log('[progress] Extracted answers array:', answersArray)
            
            if (answersArray.length > 0) {
              const restoredAnswers: QuizAnswer[] = []
              const seenAnswers = new Set<string>() // Track unique answers per question
              
              for (let i = 0; i < answersArray.length; i++) {
                const answer = answersArray[i]
                // Convert letter to statement index (A=0, B=1, C=2, D=3)
                const letterIndex = typeof answer === 'string' ? answer.charCodeAt(0) - 65 : 0
                
                // Calculate which pair this answer belongs to
                // i=0,1 → pair 0, i=2,3 → pair 1, i=4,5 → pair 2, etc.
                const questionPairIndex = Math.floor(i / 2)
                const selection = i % 2 === 0 ? 'most' : 'least'
                
                // Map to statement ID (1-96)
                // Each pair has 4 statements: (pair*4+1), (pair*4+2), (pair*4+3), (pair*4+4)
                // Add letterIndex to get the exact statement
                const statementId = questionPairIndex * 4 + 1 + letterIndex
                
                // Create unique key for this question (pair + type)
                const uniqueKey = `${questionPairIndex}-${selection}`
                
                // Only add if we haven't seen this question type in this pair yet
                if (!seenAnswers.has(uniqueKey)) {
                  restoredAnswers.push({
                    statementId,
                    selection
                  })
                  seenAnswers.add(uniqueKey)
                  console.log(`[progress] Answer ${i}: letter=${answer}, pair=${questionPairIndex}, letterIndex=${letterIndex}, statementId=${statementId}, selection=${selection} ✓`)
                } else {
                  console.log(`[progress] Answer ${i}: DUPLICATE for ${uniqueKey} - SKIPPED`)
                }
              }
              setAnswers(restoredAnswers)
              console.log('[progress] Restored', restoredAnswers.length, 'previous answers (deduplicated):', restoredAnswers)
            }
          } else {
            console.log('[progress] No answers to restore')
          }
        }
      } catch (e) {
        console.error('[progress] Exception loading progress:', e)
      }
    }

    // Load on mount (for existing attempts)
    loadProgress()

    // Listen for attempt creation event
    const handleAttemptCreated = () => {
      console.log('[progress] Attempt created event received - loading progress')
      loadProgress()
    }
    window.addEventListener('attemptCreated', handleAttemptCreated)

    return () => {
      mounted = false
      window.removeEventListener('attemptCreated', handleAttemptCreated)
    }
  }, [])

  // Save answers to database whenever they change (debounced, with duplicate prevention)
  useEffect(() => {
    const saveAnswers = async () => {
      const attemptId = typeof window !== 'undefined' ? localStorage.getItem('quizAttemptId') : null
      const candidateId = typeof window !== 'undefined' ? localStorage.getItem('candidateId') : null
      
      if (!attemptId || !candidateId || answers.length === 0) return

      // Convert answers to letters A-D
      const letters = answers.map(a => (['A','B','C','D'] as const)[((a.statementId - 1) % 4)])
      const answersHash = letters.join('')
      
      // Skip if nothing changed since last save
      if (answersHash === lastSavedAnswersRef.current) {
        saveCountRef.current.skipped++
        return
      }

      // Get auth token for API call
      const { data: sessionRes } = await supabase.auth.getSession()
      const token = sessionRes.session?.access_token
      if (!token) {
        console.warn('[answers-save] No auth token available, skipping save')
        return
      }

      try {
        const res = await fetch('/api/quiz/answers/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            attempt_id: attemptId,
            candidate_id: candidateId,
            answers: letters
          })
        })

        if (!res.ok) {
          const error = await res.json()
          console.error('[answers-save] Failed:', res.status, error)
        } else {
          lastSavedAnswersRef.current = answersHash
          saveCountRef.current.answers++
          console.log('[answers-save] Saved', answers.length, 'answers (total:', saveCountRef.current.answers, 'skipped:', saveCountRef.current.skipped + ')')
        }
      } catch (e) {
        console.error('[answers-save] Exception:', e)
      }
    }

    // Debounce: save after 1500ms of no changes (increased from 1000ms)
    const timer = setTimeout(saveAnswers, 1500)
    return () => clearTimeout(timer)
  }, [answers, statements])

  // Save current question to database whenever it changes (with duplicate prevention)
  useEffect(() => {
    const saveProgress = async () => {
      const attemptId = typeof window !== 'undefined' ? localStorage.getItem('quizAttemptId') : null
      if (!attemptId) return

      // currentQuestion is 0-indexed, but database stores 1-indexed
      const questionNumber = currentQuestion + 1
      
      // Skip if nothing changed since last save
      if (questionNumber === lastSavedQuestionRef.current) {
        return
      }

      try {
        const { data: sessionRes } = await supabase.auth.getSession()
        const token = sessionRes.session?.access_token
        if (!token) return
        
        const res = await fetch('/api/quiz/attempt/update', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            attemptId,
            currentQuestion: questionNumber
          })
        })

        if (!res.ok) {
          console.error('[progress] Failed:', res.status)
        } else {
          lastSavedQuestionRef.current = questionNumber
          saveCountRef.current.progress++
        }
      } catch (e) {
        console.error('[progress] Exception:', e)
      }
    }

    // Debounce: save after 1000ms of no changes (increased from 500ms)
    const timer = setTimeout(saveProgress, 1000)
    return () => clearTimeout(timer)
  }, [currentQuestion])

  // Heartbeat: signal active participation (with exponential backoff after initial period)
  useEffect(() => {
    let timer: any
    let stopped = false
    let beatCount = 0
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) return

      async function beat() {
        try {
          await fetch('/api/quiz/heartbeat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ quiz_id: QUIZ_ID })
          })
          beatCount++
          saveCountRef.current.heartbeat = beatCount
        } catch {}
      }
      
      await beat()
      
      // Adaptive interval: 30s for first 5 beats, then 60s
      // This reduces long-session load by ~50% while maintaining activity detection
      const scheduleNext = () => {
        if (stopped) return
        const interval = beatCount < 5 ? 30000 : 60000
        timer = setTimeout(() => {
          if (!stopped) {
            void beat().then(scheduleNext)
          }
        }, interval)
      }
      scheduleNext()
    })()
    return () => { stopped = true; if (timer) clearTimeout(timer) }
  }, [])

  // Warn user if they try to leave with unsaved answers
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if quiz is in progress and has unsaved answers
      if (candidateStatus === 'ready' && answers.length > 0 && !showThankYou && !isSubmitting) {
        e.preventDefault()
        e.returnValue = 'Je hebt onopgeslagen antwoorden. Weet je zeker dat je wilt vertrekken?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [candidateStatus, answers.length, showThankYou, isSubmitting])

  // Detect online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial state
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Monitor session timeout (check every 30 seconds, warn at 5 minutes remaining)
  useEffect(() => {
    let timer: any
    ;(async () => {
      const checkSession = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            setSessionTimeoutWarning(false)
            return
          }

          // Check when session expires
          const expiresAt = session.expires_at
          if (!expiresAt) return

          const now = Math.floor(Date.now() / 1000)
          const secondsRemaining = expiresAt - now

          // Warn if less than 5 minutes remaining
          if (secondsRemaining > 0 && secondsRemaining <= 300) {
            setSessionTimeoutWarning(true)
            setSessionTimeoutSeconds(secondsRemaining)
          } else if (secondsRemaining > 300) {
            setSessionTimeoutWarning(false)
          }
        } catch (e) {
          console.error('[session-check] Error checking session:', e)
        }
      }

      await checkSession()
      // Check every 30 seconds
      timer = setInterval(checkSession, 30000)
    })()

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [])

  // Countdown timer for session timeout warning
  useEffect(() => {
    if (!sessionTimeoutWarning || sessionTimeoutSeconds <= 0) return

    const timer = setTimeout(() => {
      setSessionTimeoutSeconds(sessionTimeoutSeconds - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [sessionTimeoutWarning, sessionTimeoutSeconds])

  // Handle session refresh
  const handleRefreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (error || !session) {
        setError('Sessie verlenging mislukt. Probeer opnieuw in te loggen.')
        return
      }
      setSessionTimeoutWarning(false)
      setSessionTimeoutSeconds(0)
    } catch (e) {
      console.error('[session-refresh] Error refreshing session:', e)
      setError('Sessie verlenging mislukt.')
    }
  }

  // Keyboard navigation: numbers 1-4 to select answers, arrow keys to navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      // Handle number keys 1-4 for answer selection
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        
        // Get the selected statement index (1-4)
        const selectedIndex = parseInt(e.key) - 1
        
        // Get available statements for current question
        let availableStatements = statements.slice(currentQuestion * 4, currentQuestion * 4 + 4)
        
        // For LEAST questions, exclude the MOST answer
        if (currentQuestion % 2 === 1) {
          const mostAnswersInPair = answers.filter(a => 
            a.selection === 'most' && 
            a.statementId >= Math.floor(currentQuestion / 2) * 4 + 1 && 
            a.statementId <= Math.floor(currentQuestion / 2) * 4 + 4
          )
          
          if (mostAnswersInPair.length > 0) {
            const mostAnswerId = mostAnswersInPair[mostAnswersInPair.length - 1].statementId
            availableStatements = availableStatements.filter(stmt => stmt.id !== mostAnswerId)
          }
        }
        
        // Select the statement at the given index
        if (selectedIndex < availableStatements.length) {
          handleAnswer(availableStatements[selectedIndex])
        }
      }
      
      // Handle arrow keys for navigation
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handleBack()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        // Move to next question if current question is answered
        const isMostQuestion = currentQuestion % 2 === 0
        const questionPairIndex = Math.floor(currentQuestion / 2)
        
        const hasAnswer = answers.some(a => 
          a.selection === (isMostQuestion ? 'most' : 'least') &&
          a.statementId >= questionPairIndex * 4 + 1 &&
          a.statementId <= questionPairIndex * 4 + 4
        )
        
        if (hasAnswer && currentQuestion < 47) {
          setCurrentQuestion(currentQuestion + 1)
        }


      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentQuestion, answers])

  const handleAnswer = (statement: Statement) => {
    const isMostQuestion = currentQuestion % 2 === 0
    const questionPairIndex = Math.floor(currentQuestion / 2)
    
    console.log('[handleAnswer] Question:', currentQuestion, 'Type:', isMostQuestion ? 'MOST' : 'LEAST')
    console.log('[handleAnswer] Question pair index:', questionPairIndex)
    console.log('[handleAnswer] Selected statement:', statement.id, statement.text)
    
    // Create answer object for this question
    const answerObj: QuizAnswer = {
      statementId: statement.id,
      selection: isMostQuestion ? 'most' : 'least'
    }
    
    // Find if there's already an answer for this question type in this pair
    // MOST questions: even indices (0, 2, 4, ...)
    // LEAST questions: odd indices (1, 3, 5, ...)
    const existingIndex = answers.findIndex(a => 
      a.selection === (isMostQuestion ? 'most' : 'least') &&
      // Check if it's in the same pair by looking at statement ID range
      a.statementId >= questionPairIndex * 4 + 1 &&
      a.statementId <= questionPairIndex * 4 + 4
    )
    
    let newAnswers: QuizAnswer[]
    
    if (existingIndex >= 0) {
      // Update existing answer for this question type in this pair
      newAnswers = [...answers]
      newAnswers[existingIndex] = answerObj
      console.log('[handleAnswer] Updated answer at index', existingIndex, 'New answers:', newAnswers)
    } else {
      // Add new answer
      newAnswers = [...answers, answerObj]
      console.log('[handleAnswer] Added new answer, total:', newAnswers.length, 'New answers:', newAnswers)
    }
    
    setAnswers(newAnswers)
    
    // Move to next question
    if (currentQuestion < 47) {
      console.log('[handleAnswer] Moving to next question:', currentQuestion + 1)
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // Show thank-you immediately and submit in background
      console.log('[handleAnswer] Quiz complete - submitting')
      setShowThankYou(true)
      void submitQuiz(newAnswers)
    }
  }

  const handleBack = () => {
    if (currentQuestion === 0) return
    
    // Simply go back one question
    // Answers are already saved, so no need to remove them
    setCurrentQuestion(currentQuestion - 1)
  }

  const submitQuiz = async (finalAnswers: QuizAnswer[]) => {
    console.log('submitQuiz called with candidateId:', candidateId)
    
    if (!candidateId) {
      logError('submit_missing_candidate', { quizId: QUIZ_ID })
      setFatalDetails({ code: 'NO_CANDIDATE', message: 'Kandidaat ontbreekt' })
      setCandidateStatus('fatalError')
      setIsSubmitting(false)
      return
    }
    
    setIsSubmitting(true)
    
    try {
      console.log('Calling /api/compute...')
      
      // Call compute API with auth header for ownership validation
      const { data: sessionRes } = await supabase.auth.getSession()
      const token = sessionRes.session?.access_token
      const response = await fetch('/api/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          candidateId,
          answers: finalAnswers
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Compute API failed:', response.status, errorText)
        throw new Error('Failed to compute results')
      }
      
      const computeResult = await response.json()
      console.log('Got compute result:', computeResult)
      
      // Persist the 48 A–D answers to public.answers via /api/answers
      // Send ALL 48 entries (both MOST and LEAST) to satisfy API schema
      try {
        const { data: sessionRes } = await supabase.auth.getSession()
        const answersToken = sessionRes.session?.access_token
        const letters = finalAnswers.map(a => (['A','B','C','D'] as const)[((a.statementId - 1) % 4)])
        const answerTexts = finalAnswers.map(a => {
          const s = statements.find(st => st.id === a.statementId)
          return s ? `${a.statementId}) ${s.text}` : ''
        })
        if (letters.length !== 48 || answerTexts.length !== 48) {
          console.warn('Expected 48 answers/texts, got', { letters: letters.length, texts: answerTexts.length })
        }
        // Use candidateId as quiz_session_id to enable idempotent updates if needed
        const attemptId = typeof window !== 'undefined' ? localStorage.getItem('quizAttemptId') : null
        await submitAnswers(letters as ('A'|'B'|'C'|'D')[], candidateId, candidateId, answerTexts, attemptId || undefined, answersToken || undefined)
      } catch (persistErr) {
        console.error('Persisting answers failed (continuing flow):', persistErr)
      }

      // Finish flow: generate PDF server-side, upload, and email to authenticated address
      try {
        const { data: sessionRes } = await supabase.auth.getSession()
        const token = sessionRes.session?.access_token
        const attemptId = typeof window !== 'undefined' ? localStorage.getItem('quizAttemptId') : null

        console.log('Finish flow - token:', !!token, 'attemptId:', attemptId)

        if (token && attemptId) {
          console.log('Calling /api/quiz/finish...')
          
          // Prepare placeholder data from computed results
          const placeholderData = {
            candidate: { full_name: personalData?.fullName || 'Deelnemer' },
            results: {
              created_at: new Date().toISOString(),
              profile_code: computeResult.profileCode,
              natural_d: computeResult.percentages.natural.D,
              natural_i: computeResult.percentages.natural.I,
              natural_s: computeResult.percentages.natural.S,
              natural_c: computeResult.percentages.natural.C,
              response_d: computeResult.percentages.response.D,
              response_i: computeResult.percentages.response.I,
              response_s: computeResult.percentages.response.S,
              response_c: computeResult.percentages.response.C
            }
          }
          
          console.log('Finish request payload:', { attempt_id: attemptId, placeholderData })
          
          const finishResponse = await fetch('/api/quiz/finish', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              attempt_id: attemptId,
              placeholderData
            })
          })
          
          console.log('Finish response status:', finishResponse.status)
          
          if (!finishResponse.ok) {
            const errorText = await finishResponse.text()
            console.error('Finish API failed:', finishResponse.status, errorText)
            throw new Error('Finish API failed')
          }
          
          const finishResult = await finishResponse.json()
          console.log('Finish API success:', finishResult)
        } else {
          console.warn('Missing attempt or auth token; skipping finish flow')
        }
      } catch (finishErr) {
        console.error('Finish flow failed:', finishErr)
      }
      
      // Redirect to results page using attempt id
      const attemptIdForRedirect = typeof window !== 'undefined' ? localStorage.getItem('quizAttemptId') : null
      if (attemptIdForRedirect) {
        router.push(`/result/${attemptIdForRedirect}`)
      } else {
        router.push(`/result/unknown`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quiz')
      setIsSubmitting(false)
    }
  }

  // Only show loading during initial auth and allowlist check
  // Quiz will show immediately after, even if candidate is still being created
  if (checkingAuth || (allowCheck === null && !noAccess)) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-3 sm:py-8 sm:px-4 md:py-12">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-4 sm:p-6 md:p-8 text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Laden...</h1>
        </div>
      </div>
    )
  }

  if (maintenanceMode) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-3 sm:py-8 sm:px-4 md:py-12">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-4 sm:p-6 md:p-8 text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-4 text-yellow-600">Quiz in onderhoud</h1>
          <p className="text-sm sm:text-base text-gray-700">De quiz is momenteel in onderhoud. Probeer het later opnieuw.</p>
        </div>
      </div>
    )
  }

  if (candidateStatus === 'fatalError') {
    const retry = () => {
      // Trigger candidate effect again by bumping retry key
      setCandidateStatus('idle')
      setRetryKey((k) => k + 1)
    }
    return (
      <ErrorWall 
        message="We konden je quiz-gegevens niet initialiseren. Probeer het opnieuw of ga terug naar de start."
        details={fatalDetails}
        onRetry={retry}
        backHref="/login"
        supportHref="https://tlcprofielen.nl/contact/"
      />
    )
  }

  if (noAccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-3 sm:py-8 sm:px-4 md:py-12">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-4 sm:p-6 md:p-8 text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Geen toegang</h1>
          <p className="text-sm sm:text-base text-gray-700">Je e-mailadres staat (nog) niet op de toegangslijst voor deze quiz.</p>
        </div>
      </div>
    )
  }

  if (showThankYou) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-3 sm:py-8 sm:px-4 md:py-12">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-4 sm:p-6 md:p-8 text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Bedankt voor het invullen</h1>
          <p className="text-sm sm:text-base text-gray-600">We verwerken je resultaten en sturen je een mail met je eindrapport.</p>
        </div>
      </div>
    )
  }

  const questionPairIndex = Math.floor(currentQuestion / 2)
  const isMostQuestion = currentQuestion % 2 === 0
  const questionStatements = statements.slice(questionPairIndex * 4, questionPairIndex * 4 + 4)
  
  // Debug logging
  console.log('[render] currentQuestion:', currentQuestion, 'isMostQuestion:', isMostQuestion)
  console.log('[render] questionPairIndex:', questionPairIndex)
  console.log('[render] answers array length:', answers.length)
  console.log('[render] answers:', answers)
  
  // For LEAST questions, exclude the previously selected MOST answer
  let availableStatements = questionStatements
  let mostAnswerObj: QuizAnswer | undefined = undefined
  
  if (!isMostQuestion && currentQuestion > 0) {
    // On LEAST question, the MOST answer is at the previous index
    // Since answers are stored in order, we need to find the answer for the previous question
    // Previous question index = currentQuestion - 1
    // But we need to find it in the answers array by matching the statement ID range
    
    console.log('[render] LEAST question - looking for MOST answer')
    
    // Method 1: Direct index lookup (MOST answer should be at currentQuestion - 1)
    // But answers array might not have all questions answered yet
    // So we search for the most recent MOST answer in this pair
    
    const mostAnswersInPair = answers.filter(a => 
      a.selection === 'most' && 
      a.statementId >= questionPairIndex * 4 + 1 && 
      a.statementId <= questionPairIndex * 4 + 4
    )
    
    console.log('[render] MOST answers in this pair:', mostAnswersInPair)
    
    if (mostAnswersInPair.length > 0) {
      // Get the last MOST answer in this pair
      mostAnswerObj = mostAnswersInPair[mostAnswersInPair.length - 1]
      console.log('[render] Found MOST answer:', mostAnswerObj)
      availableStatements = questionStatements.filter((stmt: Statement) => stmt.id !== mostAnswerObj!.statementId)
      console.log('[render] Filtered statements (excluding MOST):', availableStatements.length, 'of', questionStatements.length)
    } else {
      console.log('[render] No MOST answer found in this pair - showing all 4 options')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-3 sm:py-8 sm:px-4 md:py-12">
      {/* Offline banner */}
      {!isOnline && (
        <div className="max-w-2xl mx-auto mb-3 sm:mb-4 p-2.5 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs sm:text-sm text-yellow-800">
          Je bent offline. Antwoorden worden opgeslagen als je online bent.
        </div>
      )}

      {/* Session timeout warning */}
      {sessionTimeoutWarning && (
        <div className="max-w-2xl mx-auto mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg text-xs sm:text-sm text-red-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <span>Je sessie verloopt over {sessionTimeoutSeconds} seconde{sessionTimeoutSeconds !== 1 ? 'n' : ''}.</span>
          <button
            onClick={handleRefreshSession}
            className="w-full sm:w-auto sm:ml-2 px-3 py-1.5 sm:py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition min-h-[44px] sm:min-h-0"
          >
            Verlengen
          </button>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8">
          <Progress current={currentQuestion + 1} total={48} />
          
          <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-4 sm:mb-6">
            {isMostQuestion 
              ? 'Welke uitspraak past het MEEST bij jou?'
              : 'Welke uitspraak past het MINST bij jou?'}
          </h2>

          <div className="space-y-2 sm:space-y-3">
            {availableStatements.map((statement: Statement) => {
              // Check if this statement was already answered FOR THIS SPECIFIC QUESTION
              // Only mark as selected if:
              // 1. Statement ID matches
              // 2. Selection type (most/least) matches current question
              // 3. Statement is in the current pair
              const isSelected = answers.some(a => 
                a.statementId === statement.id &&
                a.selection === (isMostQuestion ? 'most' : 'least') &&
                a.statementId >= questionPairIndex * 4 + 1 &&
                a.statementId <= questionPairIndex * 4 + 4
              )
              
              console.log(`[render] Statement ${statement.id}: isSelected=${isSelected}, selection=${isMostQuestion ? 'most' : 'least'}`)
              
              return (
                <button
                  key={statement.id}
                  onClick={() => handleAnswer(statement)}
                  className={`w-full text-left p-3 sm:p-4 border-2 rounded-lg transition min-h-[48px] sm:min-h-[56px] text-sm sm:text-base ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 font-semibold text-blue-900'
                      : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100'
                  }`}
                  disabled={isSubmitting || candidateStatus !== 'ready'}
                >
                  <span>{statement.text}</span>
                </button>
              )
            })}
          </div>

          {currentQuestion > 0 && (
            <button
              onClick={handleBack}
              className="mt-4 sm:mt-6 w-full sm:w-auto px-6 py-2.5 sm:py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-sm sm:text-base"
              disabled={isSubmitting || candidateStatus !== 'ready'}
            >
              Terug
            </button>
          )}

          {error && (
            <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-red-100 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
          {noAccess && (
            <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-red-100 text-red-700 rounded text-xs sm:text-sm">
              U heeft (nog) geen toegang tot de test.
              <div className="text-gray-700 mt-1">
                Neem eventueel <a href="https://tlcprofielen.nl/contact/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">contact</a> op met support.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function QuizPage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 py-6 px-3 sm:py-8 sm:px-4 md:py-12">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow p-4 sm:p-6 md:p-8 text-center">
              <h1 className="text-xl sm:text-2xl font-bold mb-4">Laden...</h1>
            </div>
          </div>
        }
      >
        <QuizInner />
      </Suspense>
    </ErrorBoundary>
  )
}
