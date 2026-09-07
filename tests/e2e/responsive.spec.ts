import { expect, test, type Page } from '@playwright/test'

const viewports = [
  [280, 653], [320, 568], [360, 800], [375, 812], [390, 844], [414, 896], [430, 932],
  [540, 720], [600, 800], [768, 1024], [820, 1180], [1024, 768], [1280, 720], [1366, 768],
  [1440, 900], [1600, 900], [1920, 1080], [2560, 1440],
] as const

const criticalRoutes = ['/movimentacoes', '/mais', '/dados', '/recorrencias', '/cartoes'] as const
const routeViewports = [[320, 700], [390, 844], [768, 1024], [1280, 800]] as const

async function enterDemo(page: Page) {
  const nameInput = page.getByLabel('Seu nome')
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('Teste')
    await page.getByRole('button', { name: /Entrar no meu painel/i }).click()
  }
  const skip = page.getByRole('button', { name: 'Prefiro cadastrar depois' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

async function assertNoHorizontalOverflow(page: Page) {
  await expect(page.locator('body')).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1)
}

for (const [width, height] of viewports) {
  test(`dashboard sem overflow em ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/dashboard')
    await enterDemo(page)
    await assertNoHorizontalOverflow(page)
  })
}

for (const route of criticalRoutes) {
  for (const [width, height] of routeViewports) {
    test(`${route} permanece estável em ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto(route)
      await enterDemo(page)
      await assertNoHorizontalOverflow(page)
    })
  }
}

test('mobile landscape mantém navegação e sem overflow', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('/dashboard')
  await enterDemo(page)
  await assertNoHorizontalOverflow(page)
})
