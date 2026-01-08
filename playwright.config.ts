import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/rapport-pdf-html.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry'
  },
  projects: [
    { 
      name: 'quiz-app', 
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
      testMatch: ['**/quiz*.spec.ts'],
    },
    { 
      name: 'admin-app', 
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3001',
      },
      testMatch: ['**/admin*.spec.ts'],
    },
  ],
  webServer: [
    {
      command: 'pnpm dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      cwd: '.',
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:3001',
      reuseExistingServer: !process.env.CI,
      cwd: './apps/admin',
    },
  ],
})
