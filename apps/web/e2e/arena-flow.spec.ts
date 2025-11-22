import { test, expect } from '@playwright/test'

test.describe('Arena Flow', () => {
  test('should complete full arena lifecycle', async ({ page }) => {
    // Navigate to home page
    await page.goto('/')
    
    // Connect wallet (mock)
    await page.click('button:has-text("CONNECT WALLET")')
    
    // Should redirect to feed
    await expect(page).toHaveURL('/feed')
    
    // Navigate to create arena
    await page.click('[data-testid="create-arena-fab"]')
    await expect(page).toHaveURL('/create')
    
    // Fill in arena details
    await page.fill('[name="title"]', 'Will BTC reach $100k?')
    await page.fill('[name="question"]', 'Will Bitcoin reach $100,000 by end of year?')
    await page.fill('[name="outcomes[0]"]', 'Yes')
    await page.fill('[name="outcomes[1]"]', 'No')
    await page.fill('[name="entryFee"]', '0.1')
    
    // Submit (would require wallet approval in real scenario)
    await page.click('button:has-text("CREATE ARENA")')
    
    // Should show success and navigate to arena page
    await page.waitForURL(/\/arena\/.*/)
    
    // Verify arena details are displayed
    await expect(page.locator('h1')).toContainText('Will BTC reach $100k?')
    await expect(page.locator('text=Yes')).toBeVisible()
    await expect(page.locator('text=No')).toBeVisible()
  })

  test('should allow joining an arena', async ({ page }) => {
    // Mock: Navigate to existing arena
    await page.goto('/arena/test-arena-id')
    
    // Click bet button
    await page.click('button:has-text("Yes")')
    
    // Should show transaction pending state
    await expect(page.locator('text=Processing')).toBeVisible()
  })

  test('should show validation errors', async ({ page }) => {
    await page.goto('/create')
    
    // Try to submit without filling required fields
    await page.click('button:has-text("CREATE ARENA")')
    
    // Should show validation errors
    await expect(page.locator('text=required')).toBeVisible()
  })

  test('should display leaderboard', async ({ page }) => {
    await page.goto('/leaderboard')
    
    // Should show leaderboard table
    await expect(page.locator('[data-testid="leaderboard-table"]')).toBeVisible()
    
    // Should have rank column
    await expect(page.locator('th:has-text("Rank")')).toBeVisible()
    await expect(page.locator('th:has-text("Player")')).toBeVisible()
    await expect(page.locator('th:has-text("Score")')).toBeVisible()
  })

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Mobile navigation should be visible
    await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible()
    
    // Desktop header should be hidden
    await expect(page.locator('[data-testid="desktop-nav"]')).toBeHidden()
  })
})

