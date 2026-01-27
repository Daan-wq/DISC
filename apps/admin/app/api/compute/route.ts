import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { computeDisc } from '@/lib/disc'

const computeSchema = z.object({
  candidateId: z.string().uuid(),
  answers: z.array(z.object({
    statementId: z.number(),
    selection: z.enum(['most', 'least'])
  })).length(48)
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { candidateId, answers } = computeSchema.parse(body)
    
    // Require auth and validate candidate ownership
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: userRes } = await supabase.auth.getUser(token)
    const user = userRes?.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }
    
    // Candidate must exist and belong to current user
    const { data: cand, error: candErr } = await supabaseAdmin
      .from('candidates')
      .select('id, user_id')
      .eq('id', candidateId)
      .maybeSingle()
    
    console.log('=== COMPUTE CANDIDATE LOOKUP ===')
    console.log('Requested candidateId:', candidateId)
    console.log('Authenticated user.id:', user.id)
    console.log('Candidate lookup error:', candErr?.message)
    console.log('Candidate found:', cand ? 'yes' : 'no')
    if (cand) {
      console.log('Candidate user_id:', cand.user_id)
      console.log('User IDs match:', cand.user_id === user.id)
    }
    console.log('=== END LOOKUP ===')
    
    // Debug: List all candidates for this user
    if (!cand) {
      const { data: allCandidates } = await supabaseAdmin
        .from('candidates')
        .select('id, user_id, email')
        .eq('user_id', user.id)
      console.log('All candidates for user:', allCandidates)
    }
    
    if (candErr) {
      return NextResponse.json({ error: 'Candidate lookup failed' }, { status: 500 })
    }
    
    // Candidate must exist - no fallback creation (security: prevent ID collision attacks)
    if (!cand) {
      console.error('Candidate not found:', candidateId)
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }
    
    if (cand.user_id !== user.id) {
      console.error('Candidate ownership mismatch:', { candidateUserId: cand.user_id, authenticatedUserId: user.id })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    console.log('=== DISC CALCULATION START ===')
    console.log(`Processing ${answers.length} quiz answers`)
    
    // Use calculator (Excel-parity is the default implementation)
    const results = computeDisc(answers)
    console.log('Calculated percentages:', results.percentages)
    console.log('Profile code determined:', results.profileCode)
    console.log('=== DISC CALCULATION COMPLETE ===')
    
    // Return calculated results directly (results table removed)
    return NextResponse.json({
      profileCode: results.profileCode,
      percentages: {
        natural: {
          D: Math.round(results.percentages.natural.D),
          I: Math.round(results.percentages.natural.I),
          S: Math.round(results.percentages.natural.S),
          C: Math.round(results.percentages.natural.C)
        },
        response: {
          D: Math.round(results.percentages.response.D),
          I: Math.round(results.percentages.response.I),
          S: Math.round(results.percentages.response.S),
          C: Math.round(results.percentages.response.C)
        }
      }
    })
  } catch (error) {
    console.error('Compute error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
