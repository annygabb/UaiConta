import { expect, test } from '@playwright/test'
import { jsPDF } from 'jspdf'

async function enterDemo(page) {
  const nameInput = page.getByLabel('Seu nome')
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('Teste Safari')
    await page.getByRole('button', { name: /Entrar no meu painel/i }).click()
  }
  const skip = page.getByRole('button', { name: 'Prefiro cadastrar depois' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

test('importa PDF local no WebKit móvel', async ({ page }) => {
  await page.goto('/mais')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload()
  await enterDemo(page)

  const doc = new jsPDF()
  doc.text('10/09/2026 SUPERMERCADO CENTRAL R$ 125,90', 20, 20)
  const pdf = Buffer.from(doc.output('arraybuffer'))

  await page.getByRole('button', { name: /Importar arquivos/i }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'extrato-teste.pdf',
    mimeType: 'application/pdf',
    buffer: pdf,
  })

  await expect(page.getByText(/1 itens encontrados/i)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByLabel('Descrição importada').first()).toHaveValue(/SUPERMERCADO CENTRAL/i)
  await expect(page.getByText(/incompatibilidade com este navegador/i)).toHaveCount(0)
})
