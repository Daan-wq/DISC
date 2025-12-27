import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get report data using a one-time token
 * GET /api/rapport/get-data?token=...
 * Returns: { profileCode, natuurlijkeStijl, responsStijl, assessmentDate, candidateName }
 */
export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    // Validate token
    const { data: tokenData, error: tokenErr } = await supabaseAdmin
      .from('print_tokens')
      .select('id, attempt_id, user_id, expires_at, used')
      .eq('token', token)
      .maybeSingle();

    if (tokenErr || !tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }

    // Check if token was already used
    if (tokenData.used) {
      return NextResponse.json({ error: 'Token already used' }, { status: 401 });
    }

    // Mark token as used (one-time use)
    await supabaseAdmin
      .from('print_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    // Fetch attempt data
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, result_payload, finished_at')
      .eq('id', tokenData.attempt_id)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Fetch candidate data
    const { data: candidate, error: candidateErr } = await supabaseAdmin
      .from('candidates')
      .select('full_name, email')
      .eq('user_id', tokenData.user_id)
      .maybeSingle();

    if (candidateErr) {
      console.error('Failed to fetch candidate:', candidateErr);
    }

    // Extract data from result_payload
    const payload = attempt.result_payload || {};
    const profileCode = payload.profileCode || 'D';
    const percentages = payload.percentages || {
      natural: { D: 0, I: 0, S: 0, C: 0 },
      response: { D: 0, I: 0, S: 0, C: 0 },
    };

    return NextResponse.json({
      profileCode,
      natuurlijkeStijl: percentages.natural,
      responsStijl: percentages.response,
      assessmentDate: attempt.finished_at || new Date().toISOString(),
      candidateName: candidate?.full_name || 'Deelnemer',
    });
  } catch (e) {
    console.error('Get data error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
