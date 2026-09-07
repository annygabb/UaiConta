import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function enterDemo(page: Page) {
  const nameInput = page.getByLabel('Seu nome')
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('Teste')
    await page.getByRole('button', { name: /Entrar no meu painel/i }).click()
  }
  const skip = page.getByRole('button', { name: 'Prefiro cadastrar depois' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

for (const route of ['/dashboard', '/movimentacoes', '/analises', '/mais']) {
  test(`sem violações axe críticas em ${route}`, async ({ page }) => {
    await page.goto(route)
    await enterDemo(page)
    const results = await new AxeBuilder({ page }).analyze()
    const critical = results.violations.filter((item) => ['critical', 'serious'].includes(item.impact || ''))
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([])
  })
}
