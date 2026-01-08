import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'

import { describe, expect, test } from 'vitest'

import { VALID_PROFILE_CODES } from '../src/lib/report/template-registry'
import { renderProfileHtml } from '../src/server/rapport-pdf/renderProfileHtml'
import { type DiscScores, type RenderReportData } from '../src/server/rapport-pdf/types'

type DiscTestAnswersFile = Record<
  string,
  {
    percentages: DiscScores
  }
>

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function getEnvOrFallback(key: string, fallback: string): string {
  const value = process.env[key]
  if (!value) return fallback
  return value
}

const TEST_NAME_SHORT = getEnvOrFallback('RAPPORT_TEST_NAME_SHORT', 'Jan')
const TEST_NAME_LONG = getEnvOrFallback(
  'RAPPORT_TEST_NAME_LONG',
  'Maximiliaan Johannes Bartholomeus van den Hoogenband'
)

const FIXED_DATE_ISO = '2024-01-01T00:00:00.000Z'

const RESPONSE_STYLE: DiscScores = { D: 50, I: 50, S: 50, C: 50 }

function loadDiscTestData(): DiscTestAnswersFile {
  const repoRoot = process.cwd()
  const testDataPath = path.join(repoRoot, 'test-data', 'disc-test-answers.json')
  const raw = fs.readFileSync(testDataPath, 'utf8')
  return JSON.parse(raw) as DiscTestAnswersFile
}

const discTestData = loadDiscTestData()

describe('rapport-pdf: renderProfileHtml regression', () => {
  for (const profileCode of VALID_PROFILE_CODES) {
    test(`no unresolved placeholders (short name) - ${profileCode}`, async () => {
      const natural = discTestData[profileCode]?.percentages
      expect(natural, `Missing test-data for profile ${profileCode}`).toBeTruthy()

      const data: RenderReportData = {
        profileCode,
        assessmentDate: FIXED_DATE_ISO,
        candidateName: TEST_NAME_SHORT,
        percentages: {
          natural: natural!,
          response: RESPONSE_STYLE,
        },
      }

      const html = await renderProfileHtml(profileCode, data)

      expect(html).not.toContain('<<')
      expect(html).not.toContain('&lt;&lt;')
    })

    test(`HTML snapshot hash (short name) - ${profileCode}`, async () => {
      const natural = discTestData[profileCode]?.percentages
      expect(natural, `Missing test-data for profile ${profileCode}`).toBeTruthy()

      const data: RenderReportData = {
        profileCode,
        assessmentDate: FIXED_DATE_ISO,
        candidateName: TEST_NAME_SHORT,
        percentages: {
          natural: natural!,
          response: RESPONSE_STYLE,
        },
      }

      const html = await renderProfileHtml(profileCode, data)
      const hash = sha256(html)

      expect(hash).toMatchSnapshot()
    })

    test(`no unresolved placeholders (long name) - ${profileCode}`, async () => {
      const natural = discTestData[profileCode]?.percentages
      expect(natural, `Missing test-data for profile ${profileCode}`).toBeTruthy()

      const data: RenderReportData = {
        profileCode,
        assessmentDate: FIXED_DATE_ISO,
        candidateName: TEST_NAME_LONG,
        percentages: {
          natural: natural!,
          response: RESPONSE_STYLE,
        },
      }

      const html = await renderProfileHtml(profileCode, data)

      expect(html).not.toContain('<<')
      expect(html).not.toContain('&lt;&lt;')
    })
  }
})
