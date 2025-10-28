import { z } from 'zod'

// Personal data schema for form validation
export const PersonalDataSchema = z.object({
  fullName: z.string().min(2, 'Naam moet minimaal 2 karakters bevatten'),
  email: z.string().email('Voer een geldig e-mailadres in'),
  company: z.string().optional(),
  position: z.string().optional(),
})

export type PersonalData = z.infer<typeof PersonalDataSchema>

// Statement answer types
export type StatementAnswer = 'most' | 'least' | null

export interface QuizAnswer {
  statementId: number
  selection: 'most' | 'least'
}

// DISC result types
export interface DISCScores {
  D: number
  I: number
  S: number
  C: number
}

export interface DISCResult {
  natural: DISCScores
  response: DISCScores
  profileCode: string
}

// Form submission types
export interface QuizSubmission {
  personalData: PersonalData
  answers: StatementAnswer[]
  result: DISCResult
  submittedAt: Date
}

// Database types
export interface StoredResult {
  id: string
  name: string
  email: string
  company?: string
  position?: string
  profile_code: string
  natural_d: number
  natural_i: number
  natural_s: number
  natural_c: number
  response_d: number
  response_i: number
  response_s: number
  response_c: number
  created_at: string
  answers: StatementAnswer[]
}
