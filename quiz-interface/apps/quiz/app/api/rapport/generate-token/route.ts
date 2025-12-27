import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generate a one-time signed token for print access
 * POST /api/rapport/generate-token
 * Body: { attempt_id: string }
 * Returns: { token: string, expires_at: string }
 */
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Verify authentication
    const authHeader = req.headers.get('authorization') || '';
    const authToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRes } = await supabase.auth.getUser(authToken);
    const user = userRes?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { attempt_id } = await req.json();

    if (!attempt_id) {
      return NextResponse.json({ error: 'Missing attempt_id' }, { status: 400 });
    }

    // Verify ownership of attempt
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, user_id, finished_at')
      .eq('id', attempt_id)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (attempt.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!attempt.finished_at) {
      return NextResponse.json({ error: 'Quiz not completed' }, { status: 400 });
    }

    // Generate one-time token (valid for 1 hour)
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Store token in database (create table if needed: print_tokens)
    const { error: insertErr } = await supabaseAdmin
      .from('print_tokens')
      .insert({
        token,
        attempt_id,
        user_id: user.id,
        expires_at: expiresAt,
        used: false,
      });

    if (insertErr) {
      console.error('Failed to store print token:', insertErr);
      return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
    }

    return NextResponse.json({
      token,
      expires_at: expiresAt,
    });
  } catch (e) {
    console.error('Generate token error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
