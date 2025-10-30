import fs from 'fs'
import path from 'path'
import { type DiscResult, type DiscScores } from './types'
import { getEmbeddedConfig } from './excel_config_embedded'

export type AnswerSelection = 'most' | 'least'
export interface AnswerInput { statementId: number; selection: AnswerSelection }

export interface AnswerInputShape { response: number[]; natural: number[] }

type Axis = 'D' | 'I' | 'S' | 'C'

export interface ExcelConfigItem {
  q: number
  primary: Axis
  secondary: Axis
  weightPrimary?: number
  weightSecondary?: number
}

export interface StyleConfig {
  axes: Axis[]
  items: ExcelConfigItem[]
  denominators: Record<Axis, number>
  scaling: 'per_axis_independent' | 'normalize_to_100'
  rounding: { fn: 'ROUND' | 'ROUNDUP' | 'ROUNDDOWN' | 'BANKERS'; decimals: number; stage: 'post_scale' | 'pre_display' }
  clamp?: { min: number; max: number }
}

export interface ExcelConfig {
  version: 1
  styles: {
    natural: StyleConfig
    response: StyleConfig
  }
}

// Resolve the config path robustly for Next.js dev and prod builds.
// Strategy:
// 1) Use EXCEL_CONFIG_PATH if provided.
// 2) Try project root (process.cwd()).
// 3) Try monorepo root (../.. with apps/quiz-interface).
// 4) Try relative to this file both in src and in built .next/server.
function configCandidates(): string[] {
  const fromEnv = process.env.EXCEL_CONFIG_PATH ? [path.resolve(String(process.env.EXCEL_CONFIG_PATH))] : []
  const fromCwd = [
    path.resolve(process.cwd(), 'analysis', 'excel_parity', 'excel_config.json'),
    path.resolve(process.cwd(), 'apps', 'quiz-interface', 'analysis', 'excel_parity', 'excel_config.json'),
  ]
  const fromHere = [
    // When running from src during dev
    path.resolve(__dirname, '..', '..', '..', 'analysis', 'excel_parity', 'excel_config.json'),
    // When running from .next/server after build
    path.resolve(__dirname, '..', '..', '..', '..', 'analysis', 'excel_parity', 'excel_config.json'),
  ]
  return [...fromEnv, ...fromCwd, ...fromHere]
}

function resolveConfigPath(): string | null {
  for (const p of configCandidates()) {
    try {
      if (fs.existsSync(p)) return p
    } catch {/* ignore permission or fs issues and try next */}
  }
  return null
}

function loadConfig(): ExcelConfig {
  const p = resolveConfigPath()
  
  // Try to load from disk first (for development)
  if (p) {
    try {
      const raw = fs.readFileSync(p, 'utf-8')
      return JSON.parse(raw) as ExcelConfig
    } catch (err) {
      console.warn(`[disc:excel] Failed to load config from ${p}, falling back to embedded config:`, err)
    }
  }
  
  // Fallback to embedded config (for production or when file not found)
  console.log('[disc:excel] Using embedded config (no file I/O needed)')
  return getEmbeddedConfig()
}

function roundWith(fn: StyleConfig['rounding']['fn'], v: number, decimals: number): number {
  const f = Math.pow(10, decimals)
  switch (fn) {
    case 'ROUNDUP':
      return (v >= 0 ? Math.ceil(v * f) : Math.floor(v * f)) / f
    case 'ROUNDDOWN':
      return (v >= 0 ? Math.floor(v * f) : Math.ceil(v * f)) / f
    case 'BANKERS':
      // Bankers rounding to even for .5
      const n = v * f
      const fl = Math.floor(n)
      const frac = n - fl
      if (Math.abs(frac - 0.5) < 1e-12) {
        return ((fl % 2 === 0 ? fl : fl + 1) / f)
      }
      return Math.round(n) / f
    case 'ROUND':
    default:
      return Math.round(v * f) / f
  }
}

function clamp(v: number, min?: number, max?: number): number {
  if (typeof min === 'number') v = Math.max(min, v)
  if (typeof max === 'number') v = Math.min(max, v)
  return v
}

function tallyFromPresence(presence: number[], cfg: StyleConfig): DiscScores {
  const raw: DiscScores = { D: 0, I: 0, S: 0, C: 0 }
  const wp = cfg.items[0]?.weightPrimary ?? 1
  const ws = cfg.items[0]?.weightSecondary ?? 0.5
  for (const item of cfg.items) {
    const idx = item.q - 1
    const sel = presence[idx] ? 1 : 0
    if (!sel) continue
    const wP = item.weightPrimary ?? wp
    const wS = item.weightSecondary ?? ws
    raw[item.primary] += wP
    raw[item.secondary] += wS
  }
  return raw
}

function scaleToPercent(points: DiscScores, cfg: StyleConfig): DiscScores {
  const out: DiscScores = { D: 0, I: 0, S: 0, C: 0 }
  if (cfg.scaling === 'per_axis_independent') {
    (['D','I','S','C'] as Axis[]).forEach((ax: Axis) => {
      const denom = cfg.denominators[ax]
      const v = denom > 0 ? points[ax] / (2 * denom) : 0 // Excel uses 2*denom
      out[ax] = v * 100
    })
  } else {
    const sum = points.D + points.I + points.S + points.C
    ;(['D','I','S','C'] as Axis[]).forEach((ax: Axis) => {
      out[ax] = sum > 0 ? (points[ax] / sum) * 100 : 0
    })
  }
  return out
}

function applyClampAndRounding(percent: DiscScores, cfg: StyleConfig): DiscScores {
  const out: DiscScores = { D: 0, I: 0, S: 0, C: 0 }
  const c = cfg.clamp
  const r = cfg.rounding
  ;(['D','I','S','C'] as Axis[]).forEach((ax: Axis) => {
    let v = percent[ax]
    if (r.stage === 'pre_display') {
      v = roundWith(r.fn, v, r.decimals)
    }
    if (c) v = clamp(v, c.min, c.max)
    if (r.stage === 'post_scale') {
      v = roundWith(r.fn, v, r.decimals)
    }
    out[ax] = v
  })
  return out
}

// - Only axes >= 50% are eligible for the profile code.
// - If exactly one axis >= 50%, return that single letter.
// - If none >= 50%, return top two axes by percentage.
// - For ties, use priority D > I > C > S.
function top2Code(nat: DiscScores): string {
  const priority: Axis[] = ['D', 'I', 'C', 'S']
  const entries = (Object.entries(nat) as Array<[Axis, number]>).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return priority.indexOf(a[0]) - priority.indexOf(b[0])
  })

  // Eligible axes are those >= 50%
  const eligible = entries.filter(([_axis, pct]) => pct >= 50)

  if (eligible.length >= 2) {
    return eligible.slice(0, 2).map(([k]) => k).join('')
  }
  if (eligible.length === 1) {
    return eligible[0][0]
  }
  // All below 50%: pick the top 2 by value with tie-breaker
  return entries.slice(0, 2).map(([k]) => k).join('')
}

export function computeExcelParityFromPresence(answers: AnswerInputShape, cfg?: ExcelConfig): DiscResult {
  const conf = cfg ?? loadConfig()
  // 1) Tally points per style
  const ptsResp = tallyFromPresence(answers.response, conf.styles.response)
  const ptsNat = tallyFromPresence(answers.natural, conf.styles.natural)

  // 2) Scale to % (0..100), clamp & round per Excel rules
  const pctResp = applyClampAndRounding(scaleToPercent(ptsResp, conf.styles.response), conf.styles.response)
  const pctNat = applyClampAndRounding(scaleToPercent(ptsNat, conf.styles.natural), conf.styles.natural)

  return {
    scores: { natural: ptsNat, response: ptsResp },
    percentages: { natural: pctNat, response: pctResp },
    profileCode: top2Code(pctNat)
  }
}

export function computeExcelParity(answers: AnswerInput[]): DiscResult {
  // Convert 48 selections into 96-length presence arrays
  const resp: number[] = Array(96).fill(0)
  const nat: number[] = Array(96).fill(0)
  for (const a of answers) {
    const idx = (a.statementId - 1)
    if (idx < 0 || idx >= 96) continue
    if (a.selection === 'most') resp[idx] = 1
    if (a.selection === 'least') nat[idx] = 1
  }
  return computeExcelParityFromPresence({ response: resp, natural: nat })
}
