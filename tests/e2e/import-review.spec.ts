import { expect, test, type Page } from '@playwright/test'

async function enterDemo(page: Page) {
  const nameInput = page.getByLabel('Seu nome')
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('Revisão')
    await page.getByRole('button', { name: /Entrar no meu painel/i }).click()
  }
  const skip = page.getByRole('button', { name: 'Prefiro cadastrar depois' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

test('baixa confiança não altera totais antes da confirmação explícita', async ({ page }) => {
  await page.goto('/mais')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload()
  await enterDemo(page)

  await page.getByRole('button', { name: /Importar arquivos/i }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'sem-data.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('descricao;valor;categoria;forma_pagamento\nSupermercado Central;-42,90;Supermercado;Pix'),
  })

  await expect(page.getByText(/Revise os campos de baixa confiança/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Importar.*movimentações/i })).toBeDisabled()

  await page.getByRole('checkbox', { name: 'Selecionar Supermercado Central' }).check()
  await expect(page.getByRole('button', { name: /Importar 1 movimentações/i })).toBeEnabled()
})
