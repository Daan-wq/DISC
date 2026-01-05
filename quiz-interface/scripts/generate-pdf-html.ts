#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'

import { renderProfileHtml } from '../src/server/rapport-pdf/renderProfileHtml'
import { type RenderReportData } from '../src/server/rapport-pdf/types'

type TestDataFile = {
  [profileCode: string]: {
    percentages: {
      D: number
      I: number
      S: number
      C: number
    }
  }
}

const profiles = ['D', 'I', 'S', 'C', 'DI', 'DC', 'DS', 'ID', 'IC', 'IS', 'SD', 'SI', 'SC', 'CD', 'CI', 'CS']

const testNames: Record<string, string> = {
  D: 'Jan',
  I: 'Maria de Vries',
  S: 'Alexander van der Berg',
  C: 'Maximiliaan Johannes Bartholomeus van den Hoogenband',
  DI: 'Emma',
  DC: 'Lucas Jansen',
  DS: 'Sophie Elizabeth',
  ID: 'Test ID',
  IC: 'Test IC met langere naam',
  IS: 'Korte',
  SD: 'Een hele lange naam om te testen hoe de centrering werkt',
  SI: 'Anna',
  SC: 'Pieter van der Linden',
  CD: 'Charlotte',
  CI: 'Willem-Alexander',
  CS: 'Test CS',
}

async function main() {
  const repoRoot = process.cwd()
  const testDataPath = path.join(repoRoot, 'test-data', 'disc-test-answers.json')
  const outputDir = path.join(repoRoot, 'test-data', 'pdf-html')

  const raw = fs.readFileSync(testDataPath, 'utf8')
  const parsed = JSON.parse(raw) as TestDataFile

  fs.mkdirSync(outputDir, { recursive: true })

  console.log('[generate-pdf-html] start', { outputDir })

  for (const profileCode of profiles) {
    const entry = parsed[profileCode]
    if (!entry?.percentages) {
      console.warn('[generate-pdf-html] missing test data for profile, skipping', { profileCode })
      continue
    }

    const natural = entry.percentages
    const response = { D: 50, I: 50, S: 50, C: 50 }

    const data: RenderReportData = {
      profileCode,
      assessmentDate: new Date().toISOString(),
      candidateName: testNames[profileCode] || `Test ${profileCode}`,
      percentages: {
        natural,
        response,
      },
    }

    const html = await renderProfileHtml(profileCode, data)

    const outPath = path.join(outputDir, `${profileCode}.html`)
    fs.writeFileSync(outPath, html, 'utf8')

    console.log('[generate-pdf-html] wrote', { profileCode, outPath, kb: Math.round(html.length / 1024) })
  }

  console.log('[generate-pdf-html] done', { outputDir })
}

main().catch((err) => {
  console.error('[generate-pdf-html] failed', err)
  process.exit(1)
})
