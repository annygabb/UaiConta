import test from "node:test";
import assert from "node:assert/strict";
import { buildMonthlySeries, calculatePeriodMetrics, filterTransactions } from "../../src/finance.js";

const rows = [
  { id:"1", type:"receita", amount:5000, description:"Salário", category:"Salário", paymentMethod:"Pix", date:"2026-09-05" },
  { id:"2", type:"despesa", amount:1000, description:"Mercado", category:"Supermercado", paymentMethod:"Cartão de crédito", date:"2026-09-07" },
  { id:"3", type:"despesa", amount:500, description:"Faculdade", category:"Faculdade", paymentMethod:"Pix", date:"2026-09-08" },
  { id:"4", type:"investimento", amount:700, description:"Reserva", category:"Reserva de emergência", paymentMethod:"Pix", date:"2026-09-09" },
  { id:"5", type:"transferencia", amount:900, description:"Conta A → B", category:"Transferência entre contas", paymentMethod:"Transferência", date:"2026-09-10" },
  { id:"6", type:"receita", amount:4500, description:"Salário", category:"Salário", paymentMethod:"Pix", date:"2026-08-05" },
  { id:"7", type:"despesa", amount:2000, description:"Gastos agosto", category:"Gastos gerais", paymentMethod:"Cartão de crédito", date:"2026-08-10" }
];

test("calcula receita, gasto, investimento e sobra sem contar transferências", () => {
  const metrics = calculatePeriodMetrics(rows, "2026-09");
  assert.equal(metrics.income, 5000);
  assert.equal(metrics.expense, 1500);
  assert.equal(metrics.investments, 700);
  assert.equal(metrics.balance, 2800);
  assert.equal(Math.round(metrics.committedRate), 44);
});

test("percentuais das categorias somam aproximadamente 100%", () => {
  const metrics = calculatePeriodMetrics(rows, "2026-09");
  const total = metrics.categoryData.reduce((sum, item) => sum + item.percentage, 0);
  assert.ok(Math.abs(total - 100) < 0.001);
});

test("Pix x cartão considera somente despesas", () => {
  const metrics = calculatePeriodMetrics(rows, "2026-09");
  assert.equal(metrics.byPayment.Pix, 500);
  assert.equal(metrics.byPayment["Cartão de crédito"], 1000);
});

test("série mensal separa pix e cartão", () => {
  const series = buildMonthlySeries(rows, "2026-09", 2);
  assert.equal(series.length, 2);
  assert.equal(series[1].pix, 500);
  assert.equal(series[1].cartao, 1000);
});

test("filtros combinam período, tipo e busca", () => {
  const filtered = filterTransactions(rows, { period:"2026-09", type:"despesa", category:"todas", payment:"todas", imported:"todos", search:"mercado" });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "2");
});
