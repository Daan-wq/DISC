// Client helper for submitting DISC answers to the server API
// Normalizes numbers 1..4 to letters A..D on the server
export async function submitAnswers(
  answers: Array<'A'|'B'|'C'|'D'|1|2|3|4>,
  candidateId: string,
  quizSessionId?: string,
  answerTexts?: string[],
  attemptId?: string
): Promise<{ id: string; quiz_session_id: string | null; count: number }> {
  const body: any = { answers, candidate_id: candidateId }
  if (quizSessionId) body.quiz_session_id = quizSessionId
  if (answerTexts && answerTexts.length === 48) body.answer_texts = answerTexts
  if (attemptId) body.attempt_id = attemptId

  const res = await fetch('/api/answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await safeJson(res)
    throw new Error(`Submit failed ${res.status}: ${err?.error || res.statusText}`)
  }
  return res.json()
}

async function safeJson(res: Response) {
  try { return await res.json() } catch { return null }
}
