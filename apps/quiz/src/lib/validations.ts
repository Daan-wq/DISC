import { z } from 'zod'
import { computeDisc, type AnswerInput as DiscAnswerInput } from '@/lib/disc'

export const submissionSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  company: z.string().optional(),
  answers: z.array(z.object({
    questionId: z.string(),
    naturalAnswer: z.enum(['most', 'least', 'neutral']),
    responseAnswer: z.enum(['most', 'least', 'neutral'])
  })).length(96, 'All questions must be answered')
})

export type SubmissionInput = z.infer<typeof submissionSchema>

/**
 * Calculate DISC scores from quiz answers
 * FIXED: Proper calculation based on statement mappings, not simplistic modulo
 * @param answers - Array of 96 answers with natural and response selections
 * @returns Scores, percentages, and profile code
 */
export const calculateDISC = (answers: SubmissionInput['answers']) => {
  // Transform 96 answers into the Excel-parity input shape used by our calculator.
  // We only record presence for selections that matter per Excel parity logic:
  // - naturalAnswer === 'least' contributes to Natural presence
  // - responseAnswer === 'most' contributes to Response presence
  const transformed: DiscAnswerInput[] = []
  answers.forEach((ans, idx) => {
    const statementId = idx + 1
    if (ans.naturalAnswer === 'least') {
      transformed.push({ statementId, selection: 'least' })
    }
    if (ans.responseAnswer === 'most') {
      transformed.push({ statementId, selection: 'most' })
    }
    // 'neutral' selections produce no presence per Excel rules
  })

  const result = computeDisc(transformed)
  // Note: computeDisc already implements the profile code rules:
  // - Uses Natural percentages only for the code
  // - Applies >= 50% eligibility, allows single-letter, tie-breaker D>I>C>S
  return result
}
