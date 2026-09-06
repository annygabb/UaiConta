import { PAYMENT_METHODS } from './constants.js'
import { addMonthsToKey, monthKey, shortMonthLabel } from './utils.js'

export function inPeriod(transaction, periodKey) {
  return transaction?.date?.slice(0, 7) === periodKey
}

export function activeTransactions(transactions) {
  return transactions.filter((item) => item.status !== 'cancelled')
}

export function sumType(transactions, type, statuses = null) {
  const allowed = statuses ? new Set(statuses) : null
  return transactions
    .filter((item) => item.type === type && (!allowed || allowed.has(item.status || 'completed')))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
}

export function periodTransactions(transactions, periodKey) {
  return transactions.filter((item) => inPeriod(item, periodKey) && item.status !== 'cancelled')
}

function financialSlice(rows) {
  const realizedIncome = sumType(rows, 'receita', ['completed'])
  const realizedExpense = sumType(rows, 'despesa', ['completed'])
  const realizedInvestments = sumType(rows, 'investimento', ['completed'])
  const plannedIncome = sumType(rows, 'receita', ['planned'])
  const plannedExpense = sumType(rows, 'despesa', ['planned'])
  const plannedInvestments = sumType(rows, 'investimento', ['planned'])
  const forecastIncome = realizedIncome + plannedIncome
  const forecastExpense = realizedExpense + plannedExpense
  const forecastInvestments = realizedInvestments + plannedInvestments
  return {
    realizedIncome,
    realizedExpense,
    realizedInvestments,
    realizedBalance: realizedIncome - realizedExpense - realizedInvestments,
    plannedIncome,
    plannedExpense,
    plannedInvestments,
    forecastIncome,
    forecastExpense,
    forecastInvestments,
    forecastBalance: forecastIncome - forecastExpense - forecastInvestments,
  }
}

export function calculatePeriodMetrics(transactions, periodKey) {
  const current = periodTransactions(transactions, periodKey)
  const previousKey = addMonthsToKey(periodKey, -1)
  const previous = periodTransactions(transactions, previousKey)
  const currentFinancial = financialSlice(current)
  const previousFinancial = financialSlice(previous)

  const {
    realizedIncome,
    realizedExpense,
    realizedInvestments,
    realizedBalance,
    plannedIncome,
    plannedExpense,
    plannedInvestments,
    forecastIncome,
    forecastExpense,
    forecastInvestments,
    forecastBalance,
  } = currentFinancial

  const income = forecastIncome
  const expense = forecastExpense
  const investments = forecastInvestments
  const balance = realizedBalance

  const previousIncome = previousFinancial.forecastIncome
  const previousExpense = previousFinancial.forecastExpense
  const previousInvestments = previousFinancial.forecastInvestments
  const previousBalance = previousFinancial.realizedBalance

  const change = (value, old) => old > 0 ? ((value - old) / old) * 100 : value > 0 ? 100 : 0
  const savingsRate = forecastIncome > 0 ? (Math.max(0, forecastBalance) / forecastIncome) * 100 : 0
  const investmentRate = forecastIncome > 0 ? (forecastInvestments / forecastIncome) * 100 : 0
  const committedRate = forecastIncome > 0 ? ((forecastExpense + forecastInvestments) / forecastIncome) * 100 : 0

  const now = new Date()
  const isCurrentMonth = monthKey(now) === periodKey
  const daysElapsed = isCurrentMonth ? Math.max(1, now.getDate()) : new Date(Number(periodKey.slice(0,4)), Number(periodKey.slice(5,7)), 0).getDate()
  const daysInMonth = new Date(Number(periodKey.slice(0,4)), Number(periodKey.slice(5,7)), 0).getDate()
  const dailyAverage = realizedExpense / Math.max(1, daysElapsed)
  const paceProjection = isCurrentMonth ? dailyAverage * daysInMonth : realizedExpense
  const projectedExpense = Math.max(forecastExpense, paceProjection)
  const projectedBalance = forecastIncome - projectedExpense - forecastInvestments

  const byCategoryMap = {}
  current.filter((item) => item.type === 'despesa').forEach((item) => {
    const category = item.category || 'Não categorizado'
    byCategoryMap[category] = (byCategoryMap[category] || 0) + Number(item.amount || 0)
  })
  const categoryData = Object.entries(byCategoryMap)
    .map(([name, value]) => ({ name, value, percentage: forecastExpense > 0 ? (value / forecastExpense) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)

  const byPayment = Object.fromEntries(PAYMENT_METHODS.map((method) => [method, 0]))
  current.filter((item) => item.type === 'despesa').forEach((item) => {
    const key = PAYMENT_METHODS.includes(item.paymentMethod) ? item.paymentMethod : 'Transferência'
    byPayment[key] = (byPayment[key] || 0) + Number(item.amount || 0)
  })

  const biggest = categoryData[0]
  const cardTotal = byPayment['Cartão de crédito'] + byPayment['Cartão de débito']
  const pixTotal = byPayment.Pix || 0
  const insights = []
  if (biggest) insights.push(`${biggest.name} representa ${biggest.percentage.toFixed(0)}% das despesas realizadas + previstas do período.`)
  if (forecastExpense > previousExpense && previousExpense > 0) insights.push(`As despesas do período estão ${change(forecastExpense, previousExpense).toFixed(1)}% acima do mês anterior.`)
  if (forecastExpense < previousExpense && previousExpense > 0) insights.push(`As despesas do período estão ${Math.abs(change(forecastExpense, previousExpense)).toFixed(1)}% abaixo do mês anterior.`)
  if (forecastExpense > 0) insights.push(`Pix representa ${((pixTotal / forecastExpense) * 100).toFixed(0)}% e cartões ${((cardTotal / forecastExpense) * 100).toFixed(0)}% das despesas.`)
  if (forecastIncome > 0) insights.push(`Gastos e investimentos comprometem ${committedRate.toFixed(0)}% da receita realizada + prevista.`)
  if (plannedIncome || plannedExpense || plannedInvestments) insights.push(`Há valores previstos neste período: R$ ${plannedIncome.toLocaleString('pt-BR',{minimumFractionDigits:2})} em receitas, R$ ${plannedExpense.toLocaleString('pt-BR',{minimumFractionDigits:2})} em despesas e R$ ${plannedInvestments.toLocaleString('pt-BR',{minimumFractionDigits:2})} em investimentos.`)
  if (projectedBalance >= 0) insights.push(`A sobra projetada é de R$ ${projectedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`)
  else insights.push(`A projeção fecha o período R$ ${Math.abs(projectedBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} acima da receita.`)

  return {
    current,
    income,
    expense,
    investments,
    balance,
    realizedIncome,
    realizedExpense,
    realizedInvestments,
    realizedBalance,
    plannedIncome,
    plannedExpense,
    plannedInvestments,
    forecastIncome,
    forecastExpense,
    forecastInvestments,
    forecastBalance,
    previousIncome,
    previousExpense,
    previousInvestments,
    previousBalance,
    incomeDelta: change(income, previousIncome),
    expenseDelta: change(expense, previousExpense),
    investmentDelta: change(investments, previousInvestments),
    balanceDelta: previousBalance !== 0 ? change(realizedBalance, previousBalance) : 0,
    savingsRate,
    investmentRate,
    committedRate,
    dailyAverage,
    projectedExpense,
    projectedBalance,
    categoryData,
    byPayment,
    insights,
  }
}

export function buildMonthlySeries(transactions, endPeriod, months = 6) {
  const periods = Array.from({ length: months }, (_, index) => addMonthsToKey(endPeriod, index - months + 1))
  return periods.map((key) => {
    const rows = periodTransactions(transactions, key)
    const slice = financialSlice(rows)
    const pix = rows.filter((item) => item.type === 'despesa' && item.paymentMethod === 'Pix').reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const card = rows.filter((item) => item.type === 'despesa' && ['Cartão de crédito', 'Cartão de débito'].includes(item.paymentMethod)).reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return {
      key,
      label: shortMonthLabel(key),
      receitas: slice.forecastIncome,
      despesas: slice.forecastExpense,
      investimentos: slice.forecastInvestments,
      sobra: slice.forecastBalance,
      receitasRealizadas: slice.realizedIncome,
      despesasRealizadas: slice.realizedExpense,
      investimentosRealizados: slice.realizedInvestments,
      pix,
      cartao: card,
    }
  })
}

export function filterTransactions(transactions, filters = {}) {
  const search = String(filters.search || '').trim().toLowerCase()
  return transactions.filter((item) => {
    if (filters.period && item.date?.slice(0, 7) !== filters.period) return false
    if (filters.type && filters.type !== 'todos' && item.type !== filters.type) return false
    if (filters.status && filters.status !== 'todos' && (item.status || 'completed') !== filters.status) return false
    if (filters.category && filters.category !== 'todas' && item.category !== filters.category) return false
    if (filters.payment && filters.payment !== 'todas' && item.paymentMethod !== filters.payment) return false
    if (filters.imported === 'sim' && !item.__imported) return false
    if (filters.imported === 'nao' && item.__imported) return false
    if (search && !`${item.description} ${item.category} ${item.paymentMethod}`.toLowerCase().includes(search)) return false
    return true
  })
}
