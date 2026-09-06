import test from "node:test";
import assert from "node:assert/strict";
import { addMonthsToKey, currencyInput, parseCurrencyInput, periodLabel } from "../../src/utils.js";

test("máscara monetária trabalha em centavos", () => {
  assert.equal(parseCurrencyInput("1.234,56"), 1234.56);
  assert.equal(currencyInput(1234.56), "1.234,56");
});

test("troca mês preservando virada do ano", () => {
  assert.equal(addMonthsToKey("2026-12", 1), "2027-01");
  assert.equal(addMonthsToKey("2026-01", -1), "2025-12");
});

test("label do período contém mês e ano", () => {
  const label = periodLabel("2026-09").toLowerCase();
  assert.match(label, /setembro/);
  assert.match(label, /2026/);
});
