'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const QUIZ_ID = '00000000-0000-0000-0000-000000000001'

export default function DebugPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function runDiagnostics() {
    setLoading(true)
    const diagnostics: any = {}

    // 1. Check auth
    const { data: authData } = await supabase.auth.getUser()
    diagnostics.auth = {
      isAuthenticated: !!authData.user,
      email: authData.user?.email,
      userId: authData.user?.id
    }

    // 2. Check if quiz exists
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', QUIZ_ID)
      .maybeSingle()
    
    diagnostics.quiz = {
      exists: !!quizData,
      data: quizData,
      error: quizError?.message
    }

    // 3. Check allowlist
    if (authData.user?.email) {
      const email = authData.user.email.toLowerCase().trim()
      const { data: allowlistData, error: allowlistError } = await supabase
        .from('allowlist')
        .select('*')
        .eq('email_normalized', email)
        .maybeSingle()
      
      diagnostics.allowlist = {
        exists: !!allowlistData,
        data: allowlistData,
        error: allowlistError?.message
      }

      // 4. Check RPC function
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('has_active_allowlist_entry', {
          p_email: email,
          p_quiz_id: null
        })
      
      diagnostics.rpc = {
        allowed: rpcData,
        error: rpcError?.message
      }
    }

    // 5. Check existing attempts
    const { data: attemptsData, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', QUIZ_ID)
    
    diagnostics.attempts = {
      count: attemptsData?.length || 0,
      data: attemptsData,
      error: attemptsError?.message
    }

    // 6. Try to create attempt
    const { data: insertData, error: insertError } = await supabase
      .from('quiz_attempts')
      .insert({ quiz_id: QUIZ_ID })
      .select()
      .single()
    
    diagnostics.attemptInsert = {
      success: !!insertData,
      data: insertData,
      error: insertError ? {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      } : null
    }

    setResults(diagnostics)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Database Diagnostics</h1>
        
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Running...' : 'Run Diagnostics'}
        </button>

        {results && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-bold text-lg mb-2">Authentication</h2>
              <pre className="text-sm overflow-auto">{JSON.stringify(results.auth, null, 2)}</pre>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-bold text-lg mb-2">Quiz Exists?</h2>
              <pre className="text-sm overflow-auto">{JSON.stringify(results.quiz, null, 2)}</pre>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-bold text-lg mb-2">Allowlist Entry</h2>
              <pre className="text-sm overflow-auto">{JSON.stringify(results.allowlist, null, 2)}</pre>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-bold text-lg mb-2">RPC Check</h2>
              <pre className="text-sm overflow-auto">{JSON.stringify(results.rpc, null, 2)}</pre>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-bold text-lg mb-2">Existing Attempts</h2>
              <pre className="text-sm overflow-auto">{JSON.stringify(results.attempts, null, 2)}</pre>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-bold text-lg mb-2">Attempt Insert Test</h2>
              <pre className="text-sm overflow-auto">{JSON.stringify(results.attemptInsert, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
