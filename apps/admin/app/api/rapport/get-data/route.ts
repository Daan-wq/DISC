import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { computeDisc, type AnswerInput } from '@/lib/disc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

 const USED_GRACE_MS = 2 * 60 * 1000;

 type DiscScores = { D: number; I: number; S: number; C: number };
 type DiscPercentages = { natural: DiscScores; response: DiscScores };

 function parseTimestampMs(value: unknown): number | null {
   if (value instanceof Date) {
     const ms = value.getTime();
     return Number.isFinite(ms) ? ms : null;
   }

   if (typeof value !== 'string') return null;
   const raw = value.trim();
   if (!raw) return null;

   const direct = Date.parse(raw);
   if (Number.isFinite(direct)) return direct;

   const isoGuess = raw.replace(' ', 'T').replace(/\+00(?::?00)?$/, 'Z');
   const guessed = Date.parse(isoGuess);
   if (Number.isFinite(guessed)) return guessed;

   return null;
 }

 function normalizeLetter(value: unknown): 'A' | 'B' | 'C' | 'D' | null {
   if (value === 'A' || value === 'B' || value === 'C' || value === 'D') return value;
   return null;
 }

 function letterToOffset(letter: 'A' | 'B' | 'C' | 'D'): number {
   if (letter === 'A') return 0;
   if (letter === 'B') return 1;
   if (letter === 'C') return 2;
   return 3;
 }

 function clampPct(value: number): number {
   if (!Number.isFinite(value)) return 0;
   return Math.max(0, Math.min(100, Math.round(value)));
 }

 async function computeDiscFromAttemptAnswers(attemptId: string): Promise<{
   profileCode: string;
   percentages: DiscPercentages;
 } | null> {
   if (!supabaseAdmin) return null;

   const { data: answersRow, error: answersErr } = await supabaseAdmin
     .from('answers')
     .select('payload')
     .eq('attempt_id', attemptId)
     .maybeSingle();

   if (answersErr || !answersRow) {
     console.error('[rapport/get-data] failed to fetch answers for attempt:', {
       attemptId,
       error: answersErr,
     });
     return null;
   }

   const rawAnswers = (answersRow as any)?.payload?.answers;
   if (!Array.isArray(rawAnswers) || rawAnswers.length !== 48) {
     return null;
   }

   const letters: Array<'A' | 'B' | 'C' | 'D'> = [];
   for (const raw of rawAnswers) {
     const normalized = normalizeLetter(raw);
     if (!normalized) return null;
     letters.push(normalized);
   }

   const discAnswers: AnswerInput[] = letters.map((letter, idx) => {
     const pairIndex = Math.floor(idx / 2);
     const statementId = pairIndex * 4 + 1 + letterToOffset(letter);
     const selection = idx % 2 === 0 ? 'most' : 'least';
     return { statementId, selection };
   });

   const result = computeDisc(discAnswers);

   return {
     profileCode: result.profileCode,
     percentages: {
       natural: {
         D: clampPct(result.percentages.natural.D),
         I: clampPct(result.percentages.natural.I),
         S: clampPct(result.percentages.natural.S),
         C: clampPct(result.percentages.natural.C),
       },
       response: {
         D: clampPct(result.percentages.response.D),
         I: clampPct(result.percentages.response.I),
         S: clampPct(result.percentages.response.S),
         C: clampPct(result.percentages.response.C),
       },
     },
   };
 }

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

    console.log('[rapport/get-data] request', {
      url: req.url,
      referer: req.headers.get('referer'),
      userAgent: req.headers.get('user-agent'),
      secFetchDest: req.headers.get('sec-fetch-dest'),
      secFetchMode: req.headers.get('sec-fetch-mode'),
      secFetchSite: req.headers.get('sec-fetch-site'),
    });

    console.log('[rapport/get-data] supabaseUrl:', process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    // Validate token
    const { data: tokenData, error: tokenErr } = await supabaseAdmin
      .from('print_tokens')
      .select('id, attempt_id, user_id, expires_at, used, used_at')
      .eq('token', token)
      .maybeSingle();

    if (tokenErr) {
      const errAny = tokenErr as any;
      console.error('[rapport/get-data] token lookup failed:', {
        code: errAny?.code,
        message: errAny?.message,
        hint: errAny?.hint,
        details: errAny?.details,
      });

      if (errAny?.code === 'PGRST205') {
        return NextResponse.json(
          {
            error: "Server misconfigured: missing 'public.print_tokens' table (migration not applied or schema cache stale)",
            code: errAny.code,
          },
          { status: 500 }
        );
      }
    }

    if (tokenErr || !tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }

    // Check if token was already used
    if (tokenData.used) {
      if (!tokenData.used_at) {
        return NextResponse.json({ error: 'Token already used' }, { status: 401 });
      }

      const parsedUsedAtMs = parseTimestampMs(tokenData.used_at);
      const usedAtMs = parsedUsedAtMs ?? Date.now();
      const nowMs = Date.now();
      const withinGrace = nowMs - usedAtMs <= USED_GRACE_MS;

      if (!withinGrace) {
        return NextResponse.json({ error: 'Token already used' }, { status: 401 });
      }

      const nowIso = new Date().toISOString();
      const { error: refreshErr } = await supabaseAdmin
        .from('print_tokens')
        .update({ used_at: nowIso })
        .eq('id', tokenData.id);

      if (refreshErr) {
        console.error('[rapport/get-data] failed to refresh token used_at:', refreshErr);
      }
    }

    // Fetch attempt data
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, result_payload, finished_at')
      .eq('id', tokenData.attempt_id)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Mark token as used (idempotent for a short grace window)
    if (!tokenData.used) {
      const nowIso = new Date().toISOString();
      const { error: usedErr } = await supabaseAdmin
        .from('print_tokens')
        .update({ used: true, used_at: nowIso })
        .eq('id', tokenData.id);

      if (usedErr) {
        const errAny = usedErr as any;
        console.error('[rapport/get-data] failed to mark token used:', {
          code: errAny?.code,
          message: errAny?.message,
          hint: errAny?.hint,
          details: errAny?.details,
        });
      }
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
    let profileCode = (payload as any).profileCode || 'D';
    let percentages: DiscPercentages = (payload as any).percentages || {
      natural: { D: 0, I: 0, S: 0, C: 0 },
      response: { D: 0, I: 0, S: 0, C: 0 },
    };

    if (!(payload as any).percentages || !(payload as any).profileCode) {
      const computed = await computeDiscFromAttemptAnswers(tokenData.attempt_id);
      if (computed) {
        profileCode = computed.profileCode;
        percentages = computed.percentages;

        try {
          await supabaseAdmin
            .from('quiz_attempts')
            .update({
              result_payload: {
                profileCode,
                percentages,
              },
            })
            .eq('id', tokenData.attempt_id);
        } catch (persistErr) {
          console.error('[rapport/get-data] failed to persist computed result_payload:', persistErr);
        }
      }
    }

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
