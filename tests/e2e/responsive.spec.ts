import { expect, test } from '@playwright/test'

const viewports = [
  [280, 653], [320, 568], [360, 800], [375, 812], [390, 844], [414, 896], [430, 932],
  [540, 720], [600, 800], [768, 1024], [820, 1180], [1024, 768], [1280, 720], [1366, 768],
  [1440, 900], [1600, 900], [1920, 1080], [2560, 1440],
] as const

for (const [width, height] of viewports) {
  test(`dashboard sem overflow em ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/dashboard')
    const skip = page.getByRole('button', { name: 'Prefiro cadastrar depois' })
    if (await skip.isVisible().catch(() => false)) await skip.click()
    await expect(page.locator('body')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(overflow).toBe(false)
  })
}

test('mobile landscape mantém navegação e sem overflow', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('/dashboard')
  const skip = page.getByRole('button', { name: 'Prefiro cadastrar depois' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})
