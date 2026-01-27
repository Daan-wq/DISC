export type Axis = 'D' | 'I' | 'S' | 'C'

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

export interface ExcelConfigItem {
  q: number // statement id 1..96
  // Primary and secondary mapping per statement (from Excel columns I/J)
  primary: Axis
  secondary: Axis
  weightPrimary?: number // defaults to 1
  weightSecondary?: number // defaults to 0.5
}

export interface StyleConfig {
  axes: Axis[]
  items: ExcelConfigItem[]
  denominators: Record<Axis, number> // counts like 8, used with factor 2
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
