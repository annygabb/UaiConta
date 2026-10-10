import { test, expect } from '@playwright/test'

test('rota do WhatsApp se mantém responsiva', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/whatsapp')
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll')
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', await page.locator('html').evaluate((node) => node.clientWidth))
})
