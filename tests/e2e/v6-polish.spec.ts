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

test('seletor de período mantém ícone e texto alinhados e não altera largura da tela', async ({ page }) => {
  await resetDemo(page)
  const center = page.locator('.period-selector-v6 .period-center').first()
  await expect(center).toBeVisible()
  const icon = center.locator('svg')
  const label = center.locator('span')
  const iconColor = await icon.evaluate((node) => getComputedStyle(node).color)
  expect(iconColor).toBe('rgb(255, 255, 255)')
  const boxes = await Promise.all([icon.boundingBox(), label.boundingBox()])
  expect(boxes[0]).not.toBeNull()
  expect(boxes[1]).not.toBeNull()
  const iconCenter = boxes[0]!.y + boxes[0]!.height / 2
  const labelCenter = boxes[1]!.y + boxes[1]!.height / 2
  expect(Math.abs(iconCenter - labelCenter)).toBeLessThanOrEqual(5)
  const before = await page.evaluate(() => ({ y: window.scrollY, width: document.documentElement.scrollWidth }))
  await center.click()
  await expect(page.getByRole('dialog', { name: 'Escolher mês e ano' })).toBeVisible()
  const popoverPosition = await page.getByRole('dialog', { name: 'Escolher mês e ano' }).evaluate((node) => getComputedStyle(node).position)
  expect(popoverPosition).toBe('fixed')
  const after = await page.evaluate(() => ({ y: window.scrollY, width: document.documentElement.scrollWidth, inner: window.innerWidth }))
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(2)
  expect(after.width).toBeLessThanOrEqual(after.inner + 1)
  await page.keyboard.press('Escape')
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

test('filtros de movimentações usam seleção roxa sem pular ou alargar a página', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 560 })
  await resetDemo(page, '/movimentacoes')
  const typeFilter = page.getByRole('button', { name: 'Filtrar por tipo' })
  await typeFilter.scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, 120))
  const before = await page.evaluate(() => ({ y: window.scrollY, width: document.documentElement.scrollWidth }))
  await typeFilter.click()
  const menu = page.getByRole('listbox', { name: 'Filtrar por tipo' })
  await expect(menu).toBeVisible()
  const active = menu.getByRole('option', { name: 'Todos', exact: true })
  const background = await active.evaluate((node) => getComputedStyle(node).backgroundColor)
  expect(background).not.toBe('rgb(0, 0, 255)')
  await menu.getByRole('option', { name: 'Receitas' }).click()
  await expect(typeFilter).toContainText('Receitas')
  const after = await page.evaluate(() => ({ y: window.scrollY, width: document.documentElement.scrollWidth, inner: window.innerWidth }))
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(4)
  expect(after.width).toBeLessThanOrEqual(after.inner + 1)
})

test('calendário da movimentação abre como overlay fixo sem redimensionar o formulário', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 })
  await resetDemo(page, '/movimentacoes')
  await page.getByRole('button', { name: 'Adicionar movimentação' }).first().click()
  const dialog = page.getByRole('dialog', { name: /Adicionar item|Editar lançamento/ })
  await expect(dialog).toBeVisible()
  const before = await dialog.boundingBox()
  const picker = page.getByRole('button', { name: 'Data da movimentação' })
  await picker.click()
  const calendar = page.getByRole('dialog', { name: 'Data da movimentação' })
  await expect(calendar).toBeVisible()
  expect(await calendar.evaluate((node) => getComputedStyle(node).position)).toBe('fixed')
  const after = await dialog.boundingBox()
  expect(before).not.toBeNull()
  expect(after).not.toBeNull()
  expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
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
