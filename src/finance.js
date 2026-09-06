import { PAYMENT_METHODS } from "./constants.js";
import { addMonthsToKey, monthKey, shortMonthLabel } from "./utils.js";

export function inPeriod(transaction, periodKey) {
  return transaction?.date?.slice(0, 7) === periodKey;
}

export function sumType(transactions, type) {
  return transactions
    .filter((item) => item.type === type)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

export function periodTransactions(transactions, periodKey) {
  return transactions.filter((item) => inPeriod(item, periodKey));
}

export function calculatePeriodMetrics(transactions, periodKey) {
  const current = periodTransactions(transactions, periodKey);
  const previousKey = addMonthsToKey(periodKey, -1);
  const previous = periodTransactions(transactions, previousKey);

  const income = sumType(current, "receita");
  const expense = sumType(current, "despesa");
  const investments = sumType(current, "investimento");
  const balance = income - expense - investments;

  const previousIncome = sumType(previous, "receita");
  const previousExpense = sumType(previous, "despesa");
  const previousInvestments = sumType(previous, "investimento");
  const previousBalance = previousIncome - previousExpense - previousInvestments;

  const change = (value, old) => old > 0 ? ((value - old) / old) * 100 : value > 0 ? 100 : 0;
  const savingsRate = income > 0 ? (Math.max(0, balance) / income) * 100 : 0;
  const investmentRate = income > 0 ? (investments / income) * 100 : 0;
  const committedRate = income > 0 ? ((expense + investments) / income) * 100 : 0;

  const now = new Date();
  const isCurrentMonth = monthKey(now) === periodKey;
  const daysElapsed = isCurrentMonth ? Math.max(1, now.getDate()) : new Date(Number(periodKey.slice(0,4)), Number(periodKey.slice(5,7)), 0).getDate();
  const daysInMonth = new Date(Number(periodKey.slice(0,4)), Number(periodKey.slice(5,7)), 0).getDate();
  const dailyAverage = expense / Math.max(1, daysElapsed);
  const projectedExpense = isCurrentMonth ? dailyAverage * daysInMonth : expense;

  const recurringCurrentExpenses = current
    .filter((item) => item.type === "despesa" && item.isRecurring)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const projectedBalance = income - Math.max(expense, projectedExpense, recurringCurrentExpenses) - investments;

  const byCategoryMap = {};
  current.filter((item) => item.type === "despesa").forEach((item) => {
    byCategoryMap[item.category || "Gastos gerais"] = (byCategoryMap[item.category || "Gastos gerais"] || 0) + Number(item.amount || 0);
  });
  const categoryData = Object.entries(byCategoryMap)
    .map(([name, value]) => ({ name, value, percentage: expense > 0 ? (value / expense) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  const byPayment = Object.fromEntries(PAYMENT_METHODS.map((method) => [method, 0]));
  current.filter((item) => item.type === "despesa").forEach((item) => {
    const key = PAYMENT_METHODS.includes(item.paymentMethod) ? item.paymentMethod : "Transferência";
    byPayment[key] = (byPayment[key] || 0) + Number(item.amount || 0);
  });

  const biggest = categoryData[0];
  const cardTotal = byPayment["Cartão de crédito"] + byPayment["Cartão de débito"];
  const pixTotal = byPayment.Pix || 0;
  const insights = [];
  if (biggest) insights.push(`${biggest.name} representa ${biggest.percentage.toFixed(0)}% dos seus gastos no período.`);
  if (expense > previousExpense && previousExpense > 0) insights.push(`Seus gastos subiram ${change(expense, previousExpense).toFixed(1)}% em relação ao mês anterior.`);
  if (expense < previousExpense && previousExpense > 0) insights.push(`Seus gastos caíram ${Math.abs(change(expense, previousExpense)).toFixed(1)}% em relação ao mês anterior.`);
  if (expense > 0) insights.push(`Pix representa ${((pixTotal / expense) * 100).toFixed(0)}% e cartões ${((cardTotal / expense) * 100).toFixed(0)}% das despesas.`);
  if (income > 0) insights.push(`Você comprometeu ${committedRate.toFixed(0)}% da receita com gastos e investimentos.`);
  if (projectedBalance >= 0) insights.push(`Mantendo o ritmo atual, a sobra estimada é de R$ ${projectedBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`);
  else insights.push(`No ritmo atual, a projeção fecha o período R$ ${Math.abs(projectedBalance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} acima da receita.`);

  return {
    current,
    income,
    expense,
    investments,
    balance,
    previousIncome,
    previousExpense,
    previousInvestments,
    previousBalance,
    incomeDelta: change(income, previousIncome),
    expenseDelta: change(expense, previousExpense),
    investmentDelta: change(investments, previousInvestments),
    balanceDelta: previousBalance !== 0 ? change(balance, previousBalance) : 0,
    savingsRate,
    investmentRate,
    committedRate,
    dailyAverage,
    projectedExpense,
    projectedBalance,
    categoryData,
    byPayment,
    insights,
  };
}

export function buildMonthlySeries(transactions, endPeriod, months = 6) {
  const periods = Array.from({ length: months }, (_, index) => addMonthsToKey(endPeriod, index - months + 1));
  return periods.map((key) => {
    const rows = periodTransactions(transactions, key);
    const income = sumType(rows, "receita");
    const expense = sumType(rows, "despesa");
    const investments = sumType(rows, "investimento");
    const pix = rows.filter((item) => item.type === "despesa" && item.paymentMethod === "Pix").reduce((sum, item) => sum + item.amount, 0);
    const card = rows.filter((item) => item.type === "despesa" && ["Cartão de crédito", "Cartão de débito"].includes(item.paymentMethod)).reduce((sum, item) => sum + item.amount, 0);
    return {
      key,
      label: shortMonthLabel(key),
      receitas: income,
      despesas: expense,
      investimentos: investments,
      sobra: income - expense - investments,
      pix,
      cartao: card,
    };
  });
}

export function filterTransactions(transactions, filters = {}) {
  const search = String(filters.search || "").trim().toLowerCase();
  return transactions.filter((item) => {
    if (filters.period && item.date?.slice(0, 7) !== filters.period) return false;
    if (filters.type && filters.type !== "todos" && item.type !== filters.type) return false;
    if (filters.category && filters.category !== "todas" && item.category !== filters.category) return false;
    if (filters.payment && filters.payment !== "todas" && item.paymentMethod !== filters.payment) return false;
    if (filters.imported === "sim" && !item.__imported) return false;
    if (filters.imported === "nao" && item.__imported) return false;
    if (search && !`${item.description} ${item.category} ${item.paymentMethod}`.toLowerCase().includes(search)) return false;
    return true;
  });
}
