# Test & Release Gates — DISC Quiz Platform

> **Generated**: 2024-12-18  
> **Scope**: Minimum tests and commands required before deployment

---

## 1. Current Test Infrastructure

### 1.1 Available Tools

| Tool | Version | Purpose | Status |
|------|---------|---------|--------|
| **TypeScript** | ^5 | Type checking | ✅ Configured |
| **ESLint** | ^9 | Linting | ✅ Configured |
| **Playwright** | ^1.55.0 | E2E testing | ✅ Configured |
| **Vitest** | ^2.1.1 | Unit testing | ⚠️ In deps, no config |

### 1.2 Existing npm Scripts

```json
{
  "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
  "typecheck": "tsc --noEmit",
  "test": "playwright test",
  "test:ui": "playwright test --ui",
  "disc:parity": "tsx analysis/excel_parity/run_parity_check.ts",
  "disc:test": "vitest run tests/disc_parity.spec.ts"
}
```

### 1.3 Missing Infrastructure

| Component | Status | Required |
|-----------|--------|----------|
| CI/CD pipeline (`.github/workflows`) | ❌ Missing | Yes |
| Vitest config (`vitest.config.ts`) | ❌ Missing | Yes |
| Unit test files (`tests/*.spec.ts`) | ❌ Missing | Yes |
| E2E test files (`tests/*.e2e.ts`) | ❌ Missing | Yes |
| Secret scanning | ❌ Not configured | Recommended |
| Dependency audit | ❌ Not automated | Recommended |

---

## 2. Release Gates Checklist

### 2.1 Pre-Merge Gates (Required)

| # | Gate | Command | Exit Code |
|---|------|---------|-----------|
| 1 | **TypeScript compiles** | `npm run typecheck` | 0 |
| 2 | **ESLint passes** | `npm run lint` | 0 |
| 3 | **Build succeeds** | `npm run build` | 0 |
| 4 | **Unit tests pass** | `npm run disc:test` | 0 |
| 5 | **Dependency audit** | `npm audit --audit-level=high` | 0 |

### 2.2 Pre-Deploy Gates (Required)

| # | Gate | Command | Exit Code |
|---|------|---------|-----------|
| 6 | **E2E tests pass** | `npm run test` | 0 |
| 7 | **No secrets in code** | `npx secretlint "**/*"` | 0 |
| 8 | **Bundle size check** | (see section 5) | N/A |

### 2.3 Post-Deploy Verification

| # | Check | Method |
|---|-------|--------|
| 9 | Health check | `curl https://{domain}/api/public/maintenance-status` |
| 10 | Smoke test | Manual login + quiz start |
| 11 | PDF generation | Trigger test quiz completion |

---

## 3. Unit Tests: DISC Calculator

### 3.1 Golden Vector Test Cases

Create `tests/disc_calculator.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateDiscScores } from '@/lib/disc/excel_parity_calculator'

describe('DISC Calculator - Golden Vectors', () => {
  // Test case 1: All D answers
  it('should calculate pure D profile', () => {
    const answers = createDominantDAnswers()
    const result = calculateDiscScores(answers)
    
    expect(result.natural.D).toBeGreaterThan(result.natural.I)
    expect(result.natural.D).toBeGreaterThan(result.natural.S)
    expect(result.natural.D).toBeGreaterThan(result.natural.C)
    expect(result.profileCode).toMatch(/^D/)
  })

  // Test case 2: Balanced profile
  it('should calculate balanced DISC profile', () => {
    const answers = createBalancedAnswers()
    const result = calculateDiscScores(answers)
    
    const diff = Math.abs(result.natural.D - result.natural.S)
    expect(diff).toBeLessThan(20) // Within 20 points
  })

  // Test case 3: Known Excel parity case
  it('should match Excel calculation for reference case', () => {
    const answers = REFERENCE_CASE_ANSWERS
    const result = calculateDiscScores(answers)
    
    // These values should match the Excel spreadsheet exactly
    expect(result.natural.D).toBe(EXPECTED_NATURAL_D)
    expect(result.natural.I).toBe(EXPECTED_NATURAL_I)
    expect(result.natural.S).toBe(EXPECTED_NATURAL_S)
    expect(result.natural.C).toBe(EXPECTED_NATURAL_C)
  })

  // Test case 4: Edge case - minimum answers
  it('should handle edge case with minimal variance', () => {
    const answers = createMinimalVarianceAnswers()
    const result = calculateDiscScores(answers)
    
    expect(result.profileCode).toBeDefined()
    expect(result.natural.D + result.natural.I + result.natural.S + result.natural.C).toBeGreaterThan(0)
  })

  // Test case 5: Boundary values
  it('should clamp percentages to 0-100', () => {
    const answers = createExtremeAnswers()
    const result = calculateDiscScores(answers)
    
    expect(result.natural.D_pct).toBeGreaterThanOrEqual(0)
    expect(result.natural.D_pct).toBeLessThanOrEqual(100)
  })
})

// Helper functions to create test data
function createDominantDAnswers(): AnswerInput[] {
  // Return 86 answers that maximize D score
  return Array.from({ length: 86 }, (_, i) => ({
    statementId: i + 1,
    selection: 'most' as const,
    // D-weighted questions get 'most', others get 'least'
  }))
}
```

### 3.2 Vitest Configuration

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/disc/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 3.3 Update package.json

```json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:unit:coverage": "vitest run --coverage"
  }
}
```

---

## 4. Integration Tests: RLS Policies

### 4.1 RLS Test Scenarios

Create `tests/rls.integration.spec.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('RLS Policy Tests', () => {
  let adminClient: SupabaseClient
  let userAClient: SupabaseClient
  let userBClient: SupabaseClient
  let userAId: string
  let userBId: string

  beforeAll(async () => {
    adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    // Create test users
    const { data: userA } = await adminClient.auth.admin.createUser({
      email: 'test-user-a@example.com',
      password: 'testpassword123',
      email_confirm: true,
    })
    userAId = userA.user!.id

    const { data: userB } = await adminClient.auth.admin.createUser({
      email: 'test-user-b@example.com',
      password: 'testpassword123',
      email_confirm: true,
    })
    userBId = userB.user!.id

    // Create authenticated clients
    userAClient = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
    await userAClient.auth.signInWithPassword({
      email: 'test-user-a@example.com',
      password: 'testpassword123',
    })

    userBClient = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
    await userBClient.auth.signInWithPassword({
      email: 'test-user-b@example.com',
      password: 'testpassword123',
    })
  })

  afterAll(async () => {
    // Cleanup test users
    await adminClient.auth.admin.deleteUser(userAId)
    await adminClient.auth.admin.deleteUser(userBId)
  })

  describe('quiz_attempts isolation', () => {
    it('User A cannot read User B attempts', async () => {
      // Create attempt for User B via admin
      await adminClient.from('quiz_attempts').insert({
        user_id: userBId,
        quiz_id: '00000000-0000-0000-0000-000000000001',
      })

      // User A tries to read User B's attempts
      const { data, error } = await userAClient
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userBId)

      expect(data).toHaveLength(0) // RLS should filter out
    })

    it('User A can read own attempts', async () => {
      await adminClient.from('quiz_attempts').insert({
        user_id: userAId,
        quiz_id: '00000000-0000-0000-0000-000000000001',
      })

      const { data } = await userAClient
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userAId)

      expect(data!.length).toBeGreaterThan(0)
    })
  })

  describe('answers isolation', () => {
    it('User A cannot read User B answers', async () => {
      const { data } = await userAClient
        .from('answers')
        .select('*')
        .eq('user_id', userBId)

      expect(data).toHaveLength(0)
    })
  })

  describe('candidates isolation', () => {
    it('User A cannot read User B candidate record', async () => {
      const { data } = await userAClient
        .from('candidates')
        .select('*')
        .eq('user_id', userBId)

      expect(data).toHaveLength(0)
    })
  })
})
```

---

## 5. E2E Tests: Playwright

### 5.1 Critical User Flows

Create `tests/e2e/quiz-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Quiz Flow E2E', () => {
  const TEST_EMAIL = 'e2e-test@example.com'

  test.beforeAll(async () => {
    // Add test email to allowlist via API or direct DB
  })

  test.afterAll(async () => {
    // Cleanup test data
  })

  test('complete quiz flow: allowlist → login → quiz → finish → result', async ({ page }) => {
    // Step 1: Navigate to login
    await page.goto('/login')
    await expect(page).toHaveURL('/login')

    // Step 2: Request magic link
    await page.fill('input[name="email"]', TEST_EMAIL)
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Check je inbox')).toBeVisible()

    // Step 3: Simulate magic link click (via test hook or direct navigation)
    // In real E2E, you'd fetch the magic link from Supabase or use a test hook
    await page.goto('/auth/callback?token=TEST_TOKEN&redirect=/quiz')

    // Step 4: Quiz page loads
    await expect(page).toHaveURL('/quiz')
    await expect(page.locator('text=Vraag 1')).toBeVisible()

    // Step 5: Answer all 86 questions
    for (let i = 1; i <= 86; i++) {
      await page.click(`button[data-answer="most-${i}"]`)
      await page.click(`button[data-answer="least-${i}"]`)
      
      if (i < 86) {
        await page.click('button:has-text("Volgende")')
      }
    }

    // Step 6: Finish quiz
    await page.click('button:has-text("Voltooien")')

    // Step 7: Result page
    await expect(page).toHaveURL(/\/result/)
    await expect(page.locator('text=Je DISC Profiel')).toBeVisible()

    // Step 8: PDF should be generated (check for download link or email sent indicator)
    await expect(page.locator('text=PDF verstuurd')).toBeVisible({ timeout: 30000 })
  })
})
```

### 5.2 Admin Flow E2E

Create `tests/e2e/admin-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Admin Flow E2E', () => {
  const ADMIN_USERNAME = process.env.TEST_ADMIN_USERNAME!
  const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!

  test('admin login → results → download PDF', async ({ page }) => {
    // Step 1: Navigate to admin login
    await page.goto('/admin/login')

    // Step 2: Login
    await page.fill('input[name="username"]', ADMIN_USERNAME)
    await page.fill('input[name="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')

    // Step 3: Dashboard loads
    await expect(page).toHaveURL('/admin')
    await expect(page.locator('text=Dashboard')).toBeVisible()

    // Step 4: Navigate to results
    await page.click('a:has-text("Resultaten")')
    await expect(page).toHaveURL('/admin/results')

    // Step 5: Find a completed quiz
    await expect(page.locator('table tbody tr').first()).toBeVisible()

    // Step 6: Download PDF
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Download")')
    const download = await downloadPromise
    
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  })

  test('admin export CSV', async ({ page }) => {
    await page.goto('/admin/login')
    await page.fill('input[name="username"]', ADMIN_USERNAME)
    await page.fill('input[name="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')

    await page.goto('/admin/results')

    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Exporteer")')
    const download = await downloadPromise
    
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
  })
})
```

### 5.3 Playwright Configuration Update

Update `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['github'], // GitHub Actions annotations
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

---

## 6. Security Gates

### 6.1 Dependency Audit

```bash
# Check for vulnerabilities
npm audit

# Fail on high/critical
npm audit --audit-level=high

# Fix automatically where possible
npm audit fix

# Generate report
npm audit --json > audit-report.json
```

### 6.2 Secret Scanning

Install and configure secretlint:

```bash
npm install -D secretlint @secretlint/secretlint-rule-preset-recommend
```

Create `.secretlintrc.json`:

```json
{
  "rules": [
    {
      "id": "@secretlint/secretlint-rule-preset-recommend"
    }
  ]
}
```

Add script to `package.json`:

```json
{
  "scripts": {
    "secrets:scan": "secretlint \"**/*\" --ignore .gitignore"
  }
}
```

### 6.3 License Compliance

```bash
# Install license checker
npm install -D license-checker

# Check for problematic licenses
npx license-checker --failOn "GPL;AGPL;LGPL"
```

---

## 7. CI/CD Pipeline

### 7.1 GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

jobs:
  # Gate 1: Static Analysis
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - run: npm ci
      
      - name: TypeScript Check
        run: npm run typecheck
      
      - name: ESLint
        run: npm run lint

  # Gate 2: Unit Tests
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - run: npm ci
      
      - name: Run Unit Tests
        run: npm run test:unit
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  # Gate 3: Build
  build:
    runs-on: ubuntu-latest
    needs: [lint-typecheck, unit-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Upload Build Artifact
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: .next/

  # Gate 4: Security
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - run: npm ci
      
      - name: Dependency Audit
        run: npm audit --audit-level=high
      
      - name: Secret Scanning
        run: npx secretlint "**/*" --ignore .gitignore

  # Gate 5: E2E Tests (on main only)
  e2e:
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium
      
      - name: Download Build
        uses: actions/download-artifact@v4
        with:
          name: build
          path: .next/
      
      - name: Run E2E Tests
        run: npm run test
        env:
          E2E_BASE_URL: http://localhost:3000
          TEST_ADMIN_USERNAME: ${{ secrets.TEST_ADMIN_USERNAME }}
          TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
      
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

  # Deploy Gate
  deploy:
    runs-on: ubuntu-latest
    needs: [security, e2e]
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Vercel
        run: echo "Deploy via Vercel GitHub integration"
```

---

## 8. Quick Reference Commands

### 8.1 Development

```bash
# Start dev server
npm run dev

# Type check (watch mode)
npx tsc --noEmit --watch

# Lint with fix
npm run lint -- --fix
```

### 8.2 Testing

```bash
# Unit tests
npm run test:unit

# Unit tests with coverage
npm run test:unit:coverage

# E2E tests
npm run test

# E2E tests with UI
npm run test:ui

# Single E2E test
npx playwright test tests/e2e/quiz-flow.spec.ts
```

### 8.3 Security

```bash
# Dependency audit
npm audit

# Secret scan
npm run secrets:scan

# License check
npx license-checker --summary
```

### 8.4 Pre-Deploy Checklist

```bash
# Run all gates locally
npm run typecheck && \
npm run lint && \
npm run test:unit && \
npm audit --audit-level=high && \
npm run build && \
npm run test
```

---

## 9. Missing Tests Roadmap

### 9.1 Priority 1: Critical Path

| Test | Type | Effort |
|------|------|--------|
| DISC calculator golden vectors | Unit | 2h |
| Quiz completion flow | E2E | 4h |
| Admin login + results | E2E | 2h |

### 9.2 Priority 2: Security

| Test | Type | Effort |
|------|------|--------|
| RLS user isolation | Integration | 3h |
| Admin auth bypass attempts | E2E | 2h |
| Rate limiting verification | Integration | 1h |

### 9.3 Priority 3: Edge Cases

| Test | Type | Effort |
|------|------|--------|
| PDF generation failures | Integration | 2h |
| Email delivery failures | Integration | 1h |
| Offline/online reconnect | E2E | 2h |
| Multi-tab conflict | E2E | 1h |

---

## 10. Summary

### Current State

| Gate | Status | Command |
|------|--------|---------|
| TypeScript | ✅ Ready | `npm run typecheck` |
| ESLint | ✅ Ready | `npm run lint` |
| Build | ✅ Ready | `npm run build` |
| Unit Tests | ⚠️ No tests | `npm run test:unit` (needs setup) |
| E2E Tests | ⚠️ No tests | `npm run test` (needs tests) |
| Dep Audit | ⚠️ Not automated | `npm audit` |
| Secret Scan | ❌ Not configured | Needs setup |
| CI Pipeline | ❌ Missing | Needs `.github/workflows/ci.yml` |

### Immediate Actions

1. **Create `vitest.config.ts`** - Enable unit testing
2. **Create `tests/disc_calculator.spec.ts`** - Golden vector tests
3. **Create `tests/e2e/quiz-flow.spec.ts`** - Critical path E2E
4. **Create `.github/workflows/ci.yml`** - Automated gates
5. **Install secretlint** - Secret scanning
6. **Add `npm audit` to CI** - Dependency audit

### Minimum Viable Release Gates

```
┌─────────────────────────────────────────────────────────┐
│                    RELEASE GATES                        │
├─────────────────────────────────────────────────────────┤
│  ✓ npm run typecheck                                    │
│  ✓ npm run lint                                         │
│  ✓ npm run build                                        │
│  ✓ npm run test:unit                                    │
│  ✓ npm audit --audit-level=high                         │
│  ✓ npm run test (E2E)                                   │
│  ✓ npm run secrets:scan                                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   DEPLOY     │
                   └──────────────┘
```
