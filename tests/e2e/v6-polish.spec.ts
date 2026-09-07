import { expect, test, type Page } from '@playwright/test'

async function enterDemo(page: Page) {
  const nameInput = page.getByLabel('Seu nome')
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('Teste')
    await page.getByRole('button', { name: /Entrar no meu painel/i }).click()
  }
  const skip = page.getByRole('button', { name: 'Prefiro cadastrar depois' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

async function resetDemo(page: Page, route = '/dashboard') {
  await page.goto(route)
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload()
  await enterDemo(page)
}

test('marca não exibe Finance OS e mantém página sem overflow', async ({ page }) => {
  await resetDemo(page)
  await expect(page.locator('body')).not.toContainText('Finance OS')
  await expect(page).not.toHaveTitle(/Finance OS/i)
  const layout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1)
})

test('seletor de período usa roleta, ícone claro e não altera largura da tela', async ({ page }) => {
  await resetDemo(page)
  const trigger = page.getByRole('button', { name: /setembro de 2026|selecionar período/i }).filter({ has: page.locator('svg') }).first()
  const center = page.locator('.period-selector-v6 .period-center').first()
  await expect(center).toBeVisible()
  const iconColor = await center.locator('svg').evaluate((node) => getComputedStyle(node).color)
  expect(iconColor).toBe('rgb(255, 255, 255)')
  await center.click()
  await expect(page.getByRole('dialog', { name: 'Escolher mês e ano' })).toBeVisible()
  await expect(page.getByText('Mês', { exact: true })).toBeVisible()
  await expect(page.getByText('Ano', { exact: true })).toBeVisible()
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  expect(noOverflow).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Escolher mês e ano' })).toBeHidden()
  void trigger
})

test('sidebar recolhida mantém logo, ícones e conteúdo dentro do viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await resetDemo(page)
  const collapse = page.getByRole('button', { name: 'Recolher menu' })
  await expect(collapse).toBeVisible()
  await collapse.click()
  await expect(page.getByRole('button', { name: 'Expandir menu' })).toBeVisible()
  const logo = page.locator('.sidebar.is-collapsed .uai-brand-logo img')
  await expect(logo).toBeVisible()
  const bounds = await logo.boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(100)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})

test('filtros de movimentações não pulam a página nem expandem a largura', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 560 })
  await resetDemo(page, '/movimentacoes')
  const typeFilter = page.getByLabel('Filtrar por tipo')
  await typeFilter.scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, 120))
  const before = await page.evaluate(() => ({ y: window.scrollY, width: document.documentElement.scrollWidth }))
  await typeFilter.selectOption('receita')
  await expect(typeFilter).toHaveValue('receita')
  const during = await page.evaluate(() => ({ y: window.scrollY, width: document.documentElement.scrollWidth, inner: window.innerWidth }))
  expect(Math.abs(during.y - before.y)).toBeLessThanOrEqual(4)
  expect(during.width).toBeLessThanOrEqual(during.inner + 1)
  const after = await page.evaluate(() => window.scrollY)
  expect(Math.abs(after - before.y)).toBeLessThanOrEqual(4)
})

test('Termos e Política têm rota pública e ação de voltar', async ({ page }) => {
  await page.goto('/termos-e-privacidade#termos')
  await expect(page.getByRole('heading', { name: 'Termos de uso e Política de Privacidade' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Termos de uso', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Política de Privacidade', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Voltar ao UaiConta/i })).toBeVisible()
})

test('Dados e backup oferece JSON, PDF e Excel sem overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await resetDemo(page, '/dados')
  await expect(page.getByRole('heading', { name: 'Dados e backup' })).toBeVisible()
  await expect(page.getByRole('radio', { name: /JSON/ })).toBeVisible()
  await expect(page.getByRole('radio', { name: /PDF/ })).toBeVisible()
  await expect(page.getByRole('radio', { name: /Excel/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})

test('Mais não exibe o card técnico de rascunho de importação', async ({ page }) => {
  await resetDemo(page, '/mais')
  await expect(page.getByText('Importação que continua', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Você pode fechar e voltar depois', { exact: true })).toHaveCount(0)
})
