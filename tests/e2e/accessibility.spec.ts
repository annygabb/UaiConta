import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

for (const route of ['/dashboard', '/movimentacoes', '/analises', '/mais']) {
  test(`sem violações axe críticas em ${route}`, async ({ page }) => {
    await page.goto(route)
    const skip = page.getByRole('button', { name: 'Prefiro cadastrar depois' })
    if (await skip.isVisible().catch(() => false)) await skip.click()
    const results = await new AxeBuilder({ page }).analyze()
    const critical = results.violations.filter((item) => ['critical', 'serious'].includes(item.impact || ''))
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([])
  })
}
