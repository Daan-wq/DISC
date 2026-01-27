export type DiscScores = { D: number; I: number; S: number; C: number }

export type DiscPercentages = {
  natural: DiscScores
  response: DiscScores
}

export type RenderReportData = {
  profileCode: string
  assessmentDate: string
  candidateName: string
  percentages: DiscPercentages
}

export const PUBLICATION_FILES = [
  'publication.html',
  'publication-1.html',
  'publication-2.html',
  'publication-3.html',
  'publication-4.html',
  'publication-5.html',
  'publication-6.html',
  'publication-7.html',
  'publication-8.html',
] as const

export type PublicationFile = (typeof PUBLICATION_FILES)[number]
