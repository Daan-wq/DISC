'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Progress from '@/components/Progress'
import ErrorWall from '@/components/ErrorWall'
import { ErrorBoundary } from '@/src/components/ErrorBoundary'
import { type PersonalData, type QuizAnswer } from '@/src/lib/schema'
import { supabase } from '@/lib/supabase'
import { submitAnswers } from '@/lib/answers'

// Hardcoded quiz ID (single quiz, never changes)
const QUIZ_ID = '00000000-0000-0000-0000-000000000001'

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
  const [mostAnswer, setMostAnswer] = useState<{ id: number; text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showThankYou, setShowThankYou] = useState(false)
  const [noAccess, setNoAccess] = useState(false)
  const [candidateStatus, setCandidateStatus] = useState<'idle' | 'creating' | 'ready' | 'fatalError'>('idle')
  const [fatalDetails, setFatalDetails] = useState<{ code?: string; message?: string; hint?: string } | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  // Structured logger
  function logError(event: string, payload: Record<string, unknown>) {
    try {
      const time = new Date().toISOString()
      // Hash userId lightly to avoid leaking PII in logs (client-side non-cryptographic)
      const userId = payload.userId || 'unknown'
      const userHash = typeof userId === 'string' ? (userId.slice(0, 8) + '…') : 'unknown'
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

        // Derive full name from URL params if present
        const fn = (search?.get('fn') || '').trim()
        const ln = (search?.get('ln') || '').trim()
        const combinedName = [fn, ln].filter(Boolean).join(' ').trim()
        const nameFromEmail = email.split('@')[0]
        const preferredName = combinedName || nameFromEmail

        setCandidateStatus('creating')

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
          // Try local API first
          const res = await fetch('/api/candidate/create', {
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
        console.log('[attempt] Creating quiz_attempts record for user:', auth.user.id)
        const { data, error } = await supabase
          .from('quiz_attempts')
          .insert({ 
            quiz_id: QUIZ_ID,
            user_id: auth.user.id,
            started_at: new Date().toISOString()
          })
          .select('id, quiz_id')
          .single()

        if (error) {
          const code = error.code
          console.error('[attempt] Creation error:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: (error as any).hint
          })
          
          if (code === '23505') {
            // Unique violation: attempt already exists - fetch it
            console.log('[attempt] Unique violation - fetching existing attempt')
            const { data: found } = await supabase
              .from('quiz_attempts')
              .select('id, quiz_id')
              .order('started_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            if (found) {
              try {
                localStorage.setItem('quizAttemptId', found.id)
                localStorage.setItem('quizId', found.quiz_id)
                console.log('[attempt] Using existing attempt:', found.id)
              } catch {}
            }
          } else if (code === '42501' || code === 'PGRST301' || code === 'PGRST302') {
            // RLS policy violation or auth error - try with service role via API
            console.log('[attempt] RLS/Auth blocked - trying fallback API')
            try {
              const { data: sessionRes } = await supabase.auth.getSession()
              const apiToken = sessionRes.session?.access_token
              if (apiToken) {
                const apiRes = await fetch('/api/quiz/attempt/create', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiToken}`
                  }
                })
                if (apiRes.ok) {
                  const apiData = await apiRes.json()
                  console.log('[attempt] Fallback API created:', apiData.id)
                  if (mounted) {
                    try {
                      localStorage.setItem('quizAttemptId', apiData.id)
                      localStorage.setItem('quizId', apiData.quiz_id)
                    } catch {}
                  }
                  return
                }
              }
            } catch (fallbackErr) {
              console.error('[attempt] Fallback API failed:', fallbackErr)
            }
            console.error('[attempt] RLS blocked and fallback failed')
            if (mounted) setNoAccess(true)
          } else {
            // Unknown error - log it but don't block the UI
            console.error('[attempt] Unknown error:', code, error.message)
          }
          return
        }

        console.log('[attempt] Successfully created:', data?.id)

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

  // legacy personal form handler removed (email-only auth flow)

  // Heartbeat: signal active participation every ~25s
  useEffect(() => {
    let timer: any
    let stopped = false
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
            body: JSON.stringify({})
          })
        } catch {}
      }
      await beat()
      // Heartbeat every 30 seconds (reduced from 25s for better performance)
      // This reduces API load by ~15% while maintaining session activity
      timer = setInterval(() => { if (!stopped) void beat() }, 30000)
    })()
    return () => { stopped = true; if (timer) clearInterval(timer) }
  }, [])

  const handleAnswer = (statement: Statement) => {
    const isMostQuestion = currentQuestion % 2 === 0
    
    if (isMostQuestion) {
      // Store the MOST answer for the next question
      setMostAnswer({ id: statement.id, text: statement.text })
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // Process both MOST and LEAST answers
      const mostAnswerObj: QuizAnswer = {
        statementId: mostAnswer!.id,
        selection: 'most'
      }
      
      const leastAnswerObj: QuizAnswer = {
        statementId: statement.id,
        selection: 'least'
      }
      
      const newAnswers = [...answers, mostAnswerObj, leastAnswerObj]
      setAnswers(newAnswers)
      setMostAnswer(null)
      
      if (currentQuestion < 47) {
        setCurrentQuestion(currentQuestion + 1)
      } else {
        // Show thank-you immediately and submit in background
        setShowThankYou(true)
        void submitQuiz(newAnswers)
      }
    }
  }

  const handleBack = () => {
    if (currentQuestion === 0) return
    
    const isMostQuestion = currentQuestion % 2 === 0
    
    if (isMostQuestion) {
      // Going back from a MOST question to the previous LEAST question
      // We need to remove the last 2 answers and restore the MOST answer
      if (answers.length >= 2) {
        const newAnswers = answers.slice(0, -2)
        const restoredMostAnswer = answers[answers.length - 2]
        
        setAnswers(newAnswers)
        const stmt = statements.find(s => s.id === restoredMostAnswer.statementId)
        setMostAnswer(stmt ? { id: stmt.id, text: stmt.text } : null)
      }
      setCurrentQuestion(currentQuestion - 1)
    } else {
      // Going back from a LEAST question to the MOST question
      // Just clear the stored MOST answer
      setMostAnswer(null)
      setCurrentQuestion(currentQuestion - 1)
    }
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
        const letters = finalAnswers.map(a => (['A','B','C','D'] as const)[((a.statementId - 1) % 4)])
        const answerTexts = finalAnswers.map(a => {
          const s = statements.find(st => st.id === a.statementId)
          return s ? `${a.statementId}) ${s.text}` : ''
        })
        if (letters.length !== 48 || answerTexts.length !== 48) {
          console.warn('Expected 48 answers/texts, got', { letters: letters.length, texts: answerTexts.length })
        }
        // Use candidateId as quiz_session_id to enable idempotent updates if needed
        await submitAnswers(letters as ('A'|'B'|'C'|'D')[], candidateId, candidateId, answerTexts)
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

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Bezig met laden…</h1>
        </div>
      </div>
    )
  }

  if (maintenanceMode) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4 text-yellow-600">⚠️ Quiz in onderhoud</h1>
          <p className="text-gray-700">De quiz is momenteel in onderhoud. Probeer het later opnieuw.</p>
        </div>
      </div>
    )
  }

  if (candidateStatus === 'creating') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Voorbereiden…</h1>
          <p className="text-gray-700">We maken je quiz-gegevens klaar. Een moment geduld.</p>
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
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Geen toegang</h1>
          <p className="text-gray-700">Je e-mailadres staat (nog) niet op de toegangslijst voor deze quiz.</p>
        </div>
      </div>
    )
  }

  if (showThankYou) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Bedankt voor het invullen</h1>
          <p className="text-gray-600">We verwerken je resultaten en sturen je een mail met je eindrapport.</p>
        </div>
      </div>
    )
  }

  const questionPairIndex = Math.floor(currentQuestion / 2)
  const isMostQuestion = currentQuestion % 2 === 0
  const questionStatements = statements.slice(questionPairIndex * 4, questionPairIndex * 4 + 4)
  
  // For LEAST questions, exclude the previously selected MOST answer
  const availableStatements = isMostQuestion 
    ? questionStatements
    : questionStatements.filter((stmt: Statement) => mostAnswer ? stmt.id !== mostAnswer.id : true)

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <Progress current={currentQuestion + 1} total={48} />
          
          <h2 className="text-xl font-semibold mb-6">
            {isMostQuestion 
              ? 'Welke uitspraak past het MEEST bij jou?'
              : 'Welke uitspraak past het MINST bij jou?'}
          </h2>
          

          <div className="space-y-3">
            {availableStatements.map((statement: Statement) => (
              <button
                key={statement.id}
                onClick={() => handleAnswer(statement)}
                className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition"
                disabled={isSubmitting || candidateStatus !== 'ready'}
              >
                {statement.text}
              </button>
            ))}
          </div>

          {currentQuestion > 0 && (
            <button
              onClick={handleBack}
              className="mt-6 px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || candidateStatus !== 'ready'}
            >
              ← Terug
            </button>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          {noAccess && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded text-sm">
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
          <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
              <h1 className="text-2xl font-bold mb-4">Bezig met laden…</h1>
            </div>
          </div>
        }
      >
        <QuizInner />
      </Suspense>
    </ErrorBoundary>
  )
}
