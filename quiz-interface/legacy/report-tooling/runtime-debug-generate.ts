import fs from 'fs'
import path from 'path'
import { generateReportPdf } from '../../src/lib/report/generate-report-pdf'

async function main(): Promise<void> {
  const profileCode = (process.argv[2] || 'CD').toUpperCase()

  const pdf = await generateReportPdf({
    profileCode,
    fullName: 'Dit is een extreem lange testnaam om te forceren dat centering zichtbaar is',
    date: '2025-12-26',
    styleLabel: profileCode,
    discData: {
      natural: { D: 0, I: 0, S: 0, C: 0 },
      response: { D: 0, I: 0, S: 0, C: 0 },
    },
  })

  const outDir = path.join(process.cwd(), 'assets', 'report', 'debug')
  fs.mkdirSync(outDir, { recursive: true })

  const outPath = path.join(outDir, `${profileCode}.runtime.overlay.pdf`)
  fs.writeFileSync(outPath, pdf)
  console.log(`[runtime-debug] Wrote ${outPath}`)
}

main().catch((err) => {
  console.error('[runtime-debug] Failed', err)
  process.exit(1)
})
