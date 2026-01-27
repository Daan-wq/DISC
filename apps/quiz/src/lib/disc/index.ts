import { computeExcelParity, type AnswerInput as ExcelAnswerInput } from './excel_parity_calculator'

export type AnswerSelection = 'most' | 'least'
export interface AnswerInput { statementId: number; selection: AnswerSelection }

export interface DiscScores { D: number; I: number; S: number; C: number }
export interface DiscPercentages {
  natural: DiscScores
  response: DiscScores
}
export interface DiscResult {
  scores: { natural: DiscScores; response: DiscScores }
  percentages: DiscPercentages
  profileCode: string
}

// Excel-parity calculator is the default implementation
export function computeDisc(answers: AnswerInput[]): DiscResult {
  return computeExcelParity(answers as ExcelAnswerInput[]) as unknown as DiscResult
}
