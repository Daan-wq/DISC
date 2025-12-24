import { test, expect } from '@playwright/test'

/**
 * Admin Session Persistence Tests
 * 
 * These tests verify that the admin session persists correctly across:
 * - Page refresh (F5)
 * - Navigation between pages
 * - Browser tab close/reopen (within TTL)
 * 
 * Test user credentials are expected in environment variables:
 * - TEST_ADMIN_EMAIL
 * - TEST_ADMIN_PASSWORD
 */

const ADMIN_BASE_URL = 'http://localhost:3001'

test.describe('Admin Session Persistence', () => {
  // Skip if no test credentials
  test.beforeEach(async () => {
    if (!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD) {
      test.skip()
    }
  })

  test('session persists after page refresh (F5)', async ({ page }) => {
    // 1. Navigate to login page
    await page.goto(`${ADMIN_BASE_URL}/login`)
    await expect(page.locator('h1')).toContainText('Admin Inloggen')

    // 2. Fill in credentials and login
    await page.fill('input[name="username"]', process.env.TEST_ADMIN_EMAIL!)
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD!)
    
    // Wait for Turnstile if present (may not be in dev)
    const turnstilePresent = await page.locator('.cf-turnstile').isVisible().catch(() => false)
    if (turnstilePresent) {
      // Wait for turnstile to complete
      await page.waitForFunction(() => {
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement
        return btn && !btn.disabled
      }, { timeout: 10000 })
    }

    // 3. Submit login
    await page.click('button[type="submit"]')
    
    // 4. Wait for redirect to dashboard
    await page.waitForURL(`${ADMIN_BASE_URL}/`, { timeout: 10000 })
    
    // 5. Verify we're on the dashboard (not redirected back to login)
    await expect(page.url()).toBe(`${ADMIN_BASE_URL}/`)
    
    // 6. Verify session cookie is set
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find(c => c.name === 'admin_session')
    expect(sessionCookie).toBeDefined()
    expect(sessionCookie!.httpOnly).toBe(true)
    expect(sessionCookie!.sameSite).toBe('Lax')
    
    // 7. Refresh the page (F5)
    await page.reload()
    
    // 8. Verify we're STILL on the dashboard (not redirected to login)
    await expect(page.url()).toBe(`${ADMIN_BASE_URL}/`)
    
    // 9. Verify the page content loaded (not a redirect flash)
    // Look for dashboard-specific content
    await expect(page.locator('body')).not.toContainText('Admin Inloggen')
  })

  test('session persists after navigation', async ({ page }) => {
    // Login first
    await page.goto(`${ADMIN_BASE_URL}/login`)
    await page.fill('input[name="username"]', process.env.TEST_ADMIN_EMAIL!)
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD!)
    
    const turnstilePresent = await page.locator('.cf-turnstile').isVisible().catch(() => false)
    if (turnstilePresent) {
      await page.waitForFunction(() => {
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement
        return btn && !btn.disabled
      }, { timeout: 10000 })
    }
    
    await page.click('button[type="submit"]')
    await page.waitForURL(`${ADMIN_BASE_URL}/`, { timeout: 10000 })
    
    // Navigate to a different protected page
    await page.goto(`${ADMIN_BASE_URL}/results`)
    await expect(page.url()).toContain('/results')
    
    // Navigate back to dashboard
    await page.goto(`${ADMIN_BASE_URL}/`)
    await expect(page.url()).toBe(`${ADMIN_BASE_URL}/`)
    
    // Should still be logged in
    await expect(page.locator('body')).not.toContainText('Admin Inloggen')
  })

  test('cookie has correct TTL (480 minutes default)', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/login`)
    await page.fill('input[name="username"]', process.env.TEST_ADMIN_EMAIL!)
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD!)
    
    const turnstilePresent = await page.locator('.cf-turnstile').isVisible().catch(() => false)
    if (turnstilePresent) {
      await page.waitForFunction(() => {
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement
        return btn && !btn.disabled
      }, { timeout: 10000 })
    }
    
    await page.click('button[type="submit"]')
    await page.waitForURL(`${ADMIN_BASE_URL}/`, { timeout: 10000 })
    
    // Check cookie expiry
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find(c => c.name === 'admin_session')
    expect(sessionCookie).toBeDefined()
    
    // Max-Age should be ~28800 seconds (480 minutes)
    // Allow some tolerance for test execution time
    const expectedMaxAge = 480 * 60 // 28800 seconds
    const tolerance = 60 // 1 minute tolerance
    
    // expires is in seconds since epoch
    const now = Date.now() / 1000
    const expiresIn = sessionCookie!.expires - now
    
    expect(expiresIn).toBeGreaterThan(expectedMaxAge - tolerance)
    expect(expiresIn).toBeLessThan(expectedMaxAge + tolerance)
  })

  test('logout clears session', async ({ page }) => {
    // Login first
    await page.goto(`${ADMIN_BASE_URL}/login`)
    await page.fill('input[name="username"]', process.env.TEST_ADMIN_EMAIL!)
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD!)
    
    const turnstilePresent = await page.locator('.cf-turnstile').isVisible().catch(() => false)
    if (turnstilePresent) {
      await page.waitForFunction(() => {
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement
        return btn && !btn.disabled
      }, { timeout: 10000 })
    }
    
    await page.click('button[type="submit"]')
    await page.waitForURL(`${ADMIN_BASE_URL}/`, { timeout: 10000 })
    
    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Uitloggen"), a:has-text("Uitloggen")')
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      
      // Should be redirected to login
      await page.waitForURL(`${ADMIN_BASE_URL}/login`, { timeout: 5000 })
      
      // Cookie should be cleared
      const cookies = await page.context().cookies()
      const sessionCookie = cookies.find(c => c.name === 'admin_session')
      expect(sessionCookie).toBeUndefined()
    }
  })
})

test.describe('Admin Session - No Auth', () => {
  test('protected pages redirect to login when not authenticated', async ({ page }) => {
    // Clear any existing cookies
    await page.context().clearCookies()
    
    // Try to access protected page
    await page.goto(`${ADMIN_BASE_URL}/`)
    
    // Should redirect to login
    await expect(page.url()).toContain('/login')
  })

  test('protected API returns 401 when not authenticated', async ({ request }) => {
    const response = await request.get(`${ADMIN_BASE_URL}/api/admin/results/list`)
    expect(response.status()).toBe(401)
  })
})
