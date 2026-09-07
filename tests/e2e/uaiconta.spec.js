import { expect, test } from '@playwright/test'

async function enterDemo(page) {
  const nameInput = page.getByLabel('Seu nome')
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('Teste')
    await page.getByRole('button', { name: /Entrar no meu painel/i }).click()
  }
  const skip = page.getByRole('button', { name: 'Prefiro cadastrar depois' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

async function resetDemo(page) {
  await page.goto('/dashboard')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload()
  await enterDemo(page)
}

async function openTransactionForm(page) {
  await page.getByRole('button', { name: 'Adicionar', exact: true }).first().click()
  await expect(page.getByLabel('Valor')).toBeVisible()
}

test.beforeEach(async ({ page }) => resetDemo(page))

test('navegação principal abre Movimentações, Análises e Mais', async ({ page }) => {
  await page.getByRole('link', { name: /Movimentações|Mov\./ }).first().click()
  await expect(page).toHaveURL(/\/movimentacoes$/)
  await expect(page.getByRole('heading', { name: 'Movimentações' })).toBeVisible()

  await page.getByRole('link', { name: 'Análises' }).first().click()
  await expect(page).toHaveURL(/\/analises$/)
  await expect(page.getByRole('heading', { name: 'Análises' })).toBeVisible()

  await page.getByRole('link', { name: 'Mais' }).first().click()
  await expect(page).toHaveURL(/\/mais$/)
  await expect(page.getByRole('heading', { name: 'Mais' })).toBeVisible()
})

test('cria uma receita e atualiza card e detalhes', async ({ page }) => {
  await openTransactionForm(page)
  await page.getByRole('button', { name: 'Receita', exact: true }).click()
  await page.getByLabel('Valor').fill('500000')
  await page.getByPlaceholder('Ex: Salário NTT DATA').fill('Salário teste')
  await page.getByRole('button', { name: 'Adicionar movimentação' }).last().click()
  const card = page.getByRole('button', { name: /Abrir detalhes de Receita do mês/ })
  await expect(card).toContainText('R$ 5.000,00')
  await card.click()
  await expect(page).toHaveURL(/\/receitas$/)
  await expect(page.getByText('Salário teste')).toBeVisible()
})

test('adiciona uma despesa e mantém os gráficos no mesmo período', async ({ page }) => {
  await openTransactionForm(page)
  await page.getByLabel('Valor').fill('12590')
  await page.getByPlaceholder('Ex: Supermercado da semana').fill('Supermercado teste')
  await page.getByRole('button', { name: 'Adicionar movimentação' }).last().click()
  await expect(page.getByRole('button', { name: /Abrir detalhes de Gastos/ })).toContainText('R$ 125,90')
  await expect(page.getByText('Gastos por categoria')).toBeVisible()
  await expect(page.getByText('Pix e cartões')).toBeVisible()
})

test('rota direta funciona após refresh', async ({ page }) => {
  await page.goto('/analises')
  await enterDemo(page)
  await page.reload()
  await enterDemo(page)
  await expect(page.getByRole('heading', { name: 'Análises' })).toBeVisible()
})
