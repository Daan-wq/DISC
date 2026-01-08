#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';

type Axis = 'D' | 'I' | 'S' | 'C';

interface ExcelConfigItem {
  q: number;
  primary: Axis;
  secondary: Axis;
  weightPrimary?: number;
  weightSecondary?: number;
}

interface StyleConfig {
  axes: Axis[];
  items: ExcelConfigItem[];
  denominators: Record<Axis, number>;
  scaling: string;
  rounding: any;
  clamp?: { min: number; max: number };
}

interface ExcelConfig {
  version: number;
  styles: {
    natural: StyleConfig;
    response: StyleConfig;
  };
}

// Load config
const configPath = path.resolve(__dirname, '../analysis/excel_parity/excel_config.json');
const config: ExcelConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// All 16 possible profiles
const targetProfiles: string[] = [
  'D', 'I', 'S', 'C',           // Single letter
  'DI', 'DC', 'DS',             // D combinations
  'ID', 'IC', 'IS',             // I combinations
  'SD', 'SI', 'SC',             // S combinations
  'CD', 'CI', 'CS'              // C combinations
];

// Calculate scores from statement IDs
function calculateScores(statementIds: number[], cfg: StyleConfig): Record<Axis, number> {
  const scores: Record<Axis, number> = { D: 0, I: 0, S: 0, C: 0 };
  
  for (const item of cfg.items) {
    if (statementIds.includes(item.q)) {
      const wP = item.weightPrimary ?? 1;
      const wS = item.weightSecondary ?? 0.5;
      scores[item.primary] += wP;
      scores[item.secondary] += wS;
    }
  }
  
  return scores;
}

// Convert points to percentages
function toPercentages(points: Record<Axis, number>, cfg: StyleConfig): Record<Axis, number> {
  const out: Record<Axis, number> = { D: 0, I: 0, S: 0, C: 0 };
  
  for (const ax of ['D', 'I', 'S', 'C'] as Axis[]) {
    const denom = cfg.denominators[ax];
    let v = denom > 0 ? (points[ax] / (2 * denom)) * 100 : 0;
    
    // Apply clamp
    if (cfg.clamp) {
      v = Math.max(cfg.clamp.min, Math.min(cfg.clamp.max, v));
    }
    
    out[ax] = Math.round(v);
  }
  
  return out;
}

// Get profile code from percentages
function getProfileCode(pct: Record<Axis, number>): string {
  const priority: Axis[] = ['D', 'I', 'C', 'S'];
  const entries = (Object.entries(pct) as Array<[Axis, number]>).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return priority.indexOf(a[0]) - priority.indexOf(b[0]);
  });

  const eligible = entries.filter(([_, pct]) => pct >= 50);

  if (eligible.length >= 2) {
    return eligible.slice(0, 2).map(([k]) => k).join('');
  }
  if (eligible.length === 1) {
    return eligible[0][0];
  }
  return entries.slice(0, 2).map(([k]) => k).join('');
}

// Build statement contribution map from config
function buildStatementContributions(): Map<number, Record<Axis, number>> {
  const contributions = new Map<number, Record<Axis, number>>();
  const naturalCfg = config.styles.natural;
  
  for (const item of naturalCfg.items) {
    const contrib: Record<Axis, number> = { D: 0, I: 0, S: 0, C: 0 };
    contrib[item.primary] = item.weightPrimary ?? 1;
    contrib[item.secondary] = item.weightSecondary ?? 0.5;
    contributions.set(item.q, contrib);
  }
  
  return contributions;
}

const statementContributions = buildStatementContributions();

// Difficult profiles that need special handling
const difficultProfiles = ['C', 'I', 'DS', 'IC', 'SC'];

// Brute-force search for difficult profiles
function bruteForceSearch(targetProfile: string, maxIterations: number = 100000): { answers: any[]; percentages: Record<Axis, number> } | null {
  const naturalCfg = config.styles.natural;
  const targetAxes = targetProfile.split('') as Axis[];
  const nonTargetAxes = (['D', 'I', 'S', 'C'] as Axis[]).filter(ax => !targetAxes.includes(ax));
  
  // Build question pairs
  const questionPairs: Array<{ pairNum: number; statements: number[] }> = [];
  for (let pairNum = 1; pairNum <= 24; pairNum++) {
    const firstStatementId = (pairNum - 1) * 4 + 1;
    questionPairs.push({
      pairNum,
      statements: [firstStatementId, firstStatementId + 1, firstStatementId + 2, firstStatementId + 3]
    });
  }
  
  let bestMatch: { answers: any[]; percentages: Record<Axis, number> } | null = null;
  let bestScore = -Infinity;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const answers: any[] = [];
    
    // Randomly select LEAST for each question pair
    for (const q of questionPairs) {
      const leastIdx = Math.floor(Math.random() * 4);
      const leastId = q.statements[leastIdx];
      
      // Select MOST from remaining 3
      const mostOptions = q.statements.filter((_, i) => i !== leastIdx);
      const mostId = mostOptions[Math.floor(Math.random() * 3)];
      
      answers.push({ q: q.pairNum, most: mostId, least: leastId });
    }
    
    // Calculate percentages
    const leastIds = answers.map(a => a.least);
    const scores = calculateScores(leastIds, naturalCfg);
    const pcts = toPercentages(scores, naturalCfg);
    const actualProfile = getProfileCode(pcts);
    
    // Check if this matches the target
    if (actualProfile === targetProfile) {
      // Calculate a quality score (prefer cleaner separations)
      let score = 0;
      
      if (targetProfile.length === 1) {
        // Single letter: target should be high, others should be low
        score = pcts[targetAxes[0]] - Math.max(...nonTargetAxes.map(ax => pcts[ax]));
      } else {
        // Dual letter: first should be > second, both > 50, others < 50
        const first = pcts[targetAxes[0]];
        const second = pcts[targetAxes[1]];
        const maxNonTarget = Math.max(...nonTargetAxes.map(ax => pcts[ax]));
        score = (first - second) + (50 - maxNonTarget);
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { answers, percentages: pcts };
      }
    }
  }
  
  return bestMatch;
}

// Generate answers for a target profile with proper constraints
// For single-letter: only that axis >50%, all others <50%
// For dual-letter: both axes >50%, first letter > second letter, others <50%
function generateAnswersForProfile(targetProfile: string): { answers: any[]; scores: Record<Axis, number>; percentages: Record<Axis, number> } {
  // For difficult profiles, use brute-force search first
  if (difficultProfiles.includes(targetProfile)) {
    console.log(`  Brute-force searching for ${targetProfile}...`);
    const result = bruteForceSearch(targetProfile, 200000);
    if (result) {
      console.log(`  Found valid combination for ${targetProfile}`);
      const leastIds = result.answers.map(a => a.least);
      const scores = calculateScores(leastIds, config.styles.natural);
      return { answers: result.answers, scores, percentages: result.percentages };
    }
    console.log(`  No exact match found for ${targetProfile}, using greedy approach`);
  }
  
  const targetAxes = targetProfile.split('') as Axis[];
  const nonTargetAxes = (['D', 'I', 'S', 'C'] as Axis[]).filter(ax => !targetAxes.includes(ax));
  const naturalCfg = config.styles.natural;
  
  // For dual-letter profiles, the first letter should have higher percentage
  const primaryAxis = targetAxes[0];
  const secondaryAxis = targetAxes.length > 1 ? targetAxes[1] : null;
  
  // Build list of all possible LEAST choices per question pair
  const questionChoices: Array<{ pairNum: number; statements: number[] }> = [];
  for (let pairNum = 1; pairNum <= 24; pairNum++) {
    const firstStatementId = (pairNum - 1) * 4 + 1;
    questionChoices.push({
      pairNum,
      statements: [firstStatementId, firstStatementId + 1, firstStatementId + 2, firstStatementId + 3]
    });
  }
  
  // Score function for a complete set of LEAST selections
  function scoreSelection(leastIds: number[]): number {
    const scores = calculateScores(leastIds, naturalCfg);
    const pcts = toPercentages(scores, naturalCfg);
    
    let score = 0;
    
    // Target axes should be >50%
    for (const ax of targetAxes) {
      if (pcts[ax] >= 50) {
        score += 100;
        score += pcts[ax]; // Higher is better
      } else {
        score -= (50 - pcts[ax]) * 5; // Penalty for being under 50%
      }
    }
    
    // Non-target axes should be <50%
    for (const ax of nonTargetAxes) {
      if (pcts[ax] < 50) {
        score += 50;
        score += (49 - pcts[ax]); // Lower is better
      } else {
        score -= (pcts[ax] - 49) * 10; // Heavy penalty for being >=50%
      }
    }
    
    // For dual-letter, primary should be >= secondary
    if (secondaryAxis && pcts[primaryAxis] >= pcts[secondaryAxis]) {
      score += 50;
    } else if (secondaryAxis) {
      score -= (pcts[secondaryAxis] - pcts[primaryAxis]) * 2;
    }
    
    return score;
  }
  
  // Greedy selection with scoring
  let bestAnswers: any[] = [];
  let bestLeastIds: number[] = [];
  let bestTotalScore = -Infinity;
  
  // Try many strategy variations
  const strategies: Array<{ primaryWeight: number; secondaryWeight: number; nonTargetPenalty: number }> = [];
  for (let pw = 1; pw <= 5; pw += 0.5) {
    for (let sw = 0.5; sw <= 3; sw += 0.5) {
      for (let np = 2; np <= 6; np += 1) {
        strategies.push({ primaryWeight: pw, secondaryWeight: sw, nonTargetPenalty: np });
      }
    }
  }
  // Add some extreme strategies for difficult profiles
  strategies.push({ primaryWeight: 10, secondaryWeight: 0.1, nonTargetPenalty: 10 });
  strategies.push({ primaryWeight: 0.5, secondaryWeight: 3, nonTargetPenalty: 8 });
  strategies.push({ primaryWeight: 5, secondaryWeight: 5, nonTargetPenalty: 2 });
  
  for (const strategy of strategies) {
    const answers: any[] = [];
    
    for (const q of questionChoices) {
      let bestLeast = q.statements[0];
      let bestScore = -Infinity;
      
      for (const stmtId of q.statements) {
        const contrib = statementContributions.get(stmtId);
        if (!contrib) continue;
        
        let score = 0;
        if (targetProfile.length === 1) {
          score = contrib[primaryAxis] * strategy.primaryWeight 
                - nonTargetAxes.reduce((sum, ax) => sum + contrib[ax] * strategy.nonTargetPenalty, 0);
        } else {
          const primaryContrib = contrib[primaryAxis];
          const secondaryContrib = secondaryAxis ? contrib[secondaryAxis] : 0;
          const nonTargetContrib = nonTargetAxes.reduce((sum, ax) => sum + contrib[ax], 0);
          score = primaryContrib * strategy.primaryWeight 
                + secondaryContrib * strategy.secondaryWeight 
                - nonTargetContrib * strategy.nonTargetPenalty;
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestLeast = stmtId;
        }
      }
      
      const mostOptions = q.statements.filter(s => s !== bestLeast);
      let bestMost = mostOptions[0];
      let lowestNonTarget = Infinity;
      
      for (const stmtId of mostOptions) {
        const contrib = statementContributions.get(stmtId);
        if (!contrib) continue;
        const nonTargetContrib = nonTargetAxes.reduce((sum, ax) => sum + contrib[ax], 0);
        if (nonTargetContrib < lowestNonTarget) {
          lowestNonTarget = nonTargetContrib;
          bestMost = stmtId;
        }
      }
      
      answers.push({ q: q.pairNum, most: bestMost, least: bestLeast });
    }
    
    const leastIds = answers.map(a => a.least);
    const totalScore = scoreSelection(leastIds);
    
    if (totalScore > bestTotalScore) {
      bestTotalScore = totalScore;
      bestAnswers = answers;
      bestLeastIds = leastIds;
    }
  }
  
  const scores = calculateScores(bestLeastIds, naturalCfg);
  const percentages = toPercentages(scores, naturalCfg);
  
  return { answers: bestAnswers, scores, percentages };
}

// Main generation
console.log('Generating DISC test profiles...\n');

const testData: Record<string, any> = {};
const results: any[] = [];

for (const targetProfile of targetProfiles) {
  console.log(`Generating: ${targetProfile}`);
  
  const { answers, percentages } = generateAnswersForProfile(targetProfile);
  const actualProfile = getProfileCode(percentages);
  
  testData[targetProfile] = {
    targetProfile,
    actualProfile,
    percentages,
    answers
  };
  
  results.push({
    target: targetProfile,
    actual: actualProfile,
    match: targetProfile === actualProfile ? 'OK' : 'FAIL',
    D: percentages.D,
    I: percentages.I,
    S: percentages.S,
    C: percentages.C
  });
}

// Save JSON
const jsonPath = path.resolve(__dirname, '../test-data/disc-test-answers.json');
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(testData, null, 2), 'utf-8');

// Print summary table
console.log('\nGeneration Results:\n');
console.log('Target | Actual | Match |  D  |  I  |  S  |  C  |');
console.log('-------|--------|-------|-----|-----|-----|-----|');
results.forEach(r => {
  console.log(
    `  ${r.target.padEnd(4)} | ${r.actual.padEnd(6)} |  ${r.match.padEnd(4)} | ${String(r.D).padStart(3)} | ${String(r.I).padStart(3)} | ${String(r.S).padStart(3)} | ${String(r.C).padStart(3)} |`
  );
});

console.log(`\nGenerated ${targetProfiles.length} test profiles`);
console.log(`Saved to: ${jsonPath}\n`);
