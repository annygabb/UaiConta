import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/dashboard");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const skip = page.getByRole("button", { name: "Prefiro cadastrar depois" });
  if (await skip.isVisible().catch(() => false)) await skip.click();
});

test("navegação principal abre Movimentações, Análises e Mais", async ({ page }) => {
  await page.getByRole("button", { name: /Movimentações|Mov\./ }).first().click();
  await expect(page).toHaveURL(/\/movimentacoes$/);
  await expect(page.getByRole("heading", { name: "Movimentações" })).toBeVisible();

  await page.getByRole("button", { name: "Análises" }).first().click();
  await expect(page).toHaveURL(/\/analises$/);
  await expect(page.getByRole("heading", { name: "Análises" })).toBeVisible();

  await page.getByRole("button", { name: "Mais" }).first().click();
  await expect(page).toHaveURL(/\/mais$/);
  await expect(page.getByRole("heading", { name: "Mais" })).toBeVisible();
});

test("cria uma receita e atualiza o card", async ({ page }) => {
  await page.getByRole("button", { name: /Adicionar movimentação/ }).first().click();
  await page.getByRole("button", { name: "Receita", exact: true }).click();
  const value = page.getByLabel("Valor");
  await value.fill("500000");
  await page.getByPlaceholder("Ex: Salário NTT DATA").fill("Salário teste");
  await page.getByRole("button", { name: /Adicionar movimentação/ }).last().click();
  await expect(page.getByRole("button", { name: /Abrir detalhes de Receita do mês/ })).toContainText("R$ 5.000,00");
});

test("layout mobile exibe bottom navigation sem overflow horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.locator(".mobile-nav")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBeFalsy();
});
