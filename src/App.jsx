import React, { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { IconAlertCircle, IconCircleCheck, IconLoader2, IconPlus } from '@tabler/icons-react'
import { ROUTES } from './constants.js'
import { buildMonthlySeries, calculatePeriodMetrics, periodTransactions } from './finance.js'
import { addMonthsToKey, monthKey, periodLabel } from './utils.js'
import {
  dataMode,
  deleteTransaction,
  getLocalMigrationRows,
  initializeAuth,
  isMigrationDone,
  isOnboarded,
  isSupabaseConfigured,
  loadTransactions,
  markMigrationDone,
  markOnboarded,
  onAuthChanged,
  saveManyTransactions,
  saveTransaction,
  signOut,
} from './dataService.js'
import { MobileNav, Sidebar } from './components/Navigation.jsx'
import { PeriodSelector } from './components/Common.jsx'
import TransactionForm from './components/TransactionForm.jsx'
import PdfImportModal from './components/PdfImportModal.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import IncomeOnboarding from './components/IncomeOnboarding.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import TransactionsPage from './pages/TransactionsPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import MorePage from './pages/MorePage.jsx'
import DetailPage from './pages/DetailPage.jsx'
import AccountsPage from './pages/settings/AccountsPage.jsx'
import CardsPage from './pages/settings/CardsPage.jsx'
import CategoriesPage from './pages/settings/CategoriesPage.jsx'
import IncomeSourcesPage from './pages/settings/IncomeSourcesPage.jsx'
import RecurrencesPage from './pages/settings/RecurrencesPage.jsx'
import BudgetsPage from './pages/settings/BudgetsPage.jsx'
import GoalsPage from './pages/settings/GoalsPage.jsx'
import ReceiptsPage from './pages/settings/ReceiptsPage.jsx'
import PreferencesPage from './pages/settings/PreferencesPage.jsx'
import DataPrivacyPage from './pages/settings/DataPrivacyPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import { recurrenceRepository } from './features/recurrences/recurrence.repository.ts'
import { projectRecurrence, recurrenceOccurrenceKey } from './features/recurrences/recurrence.ts'

export default function UaiConta() {
  const location = useLocation()
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [transactions, setTransactions] = useState([])
  const [recurrenceRules, setRecurrenceRules] = useState([])
  const [period, setPeriod] = useState(() => monthKey(new Date()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [formState, setFormState] = useState(null)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthReady(true)
      return undefined
    }
    let active = true
    initializeAuth()
      .then((nextSession) => { if (active) setSession(nextSession) })
      .catch((err) => { if (active) setError(err?.message || 'Não foi possível restaurar sua sessão.') })
      .finally(() => { if (active) setAuthReady(true) })
    const unsubscribe = onAuthChanged((nextSession) => { if (active) setSession(nextSession) })
    return () => { active = false; unsubscribe?.() }
  }, [])

  useEffect(() => {
    if (!authReady || (isSupabaseConfigured && !session?.access_token)) {
      setLoading(false)
      setTransactions([])
      return
    }
    let active = true
    setLoading(true)
    loadTransactions()
      .then(async (rows) => {
        if (!active) return
        let finalRows = rows
        if (isSupabaseConfigured && session?.user?.id && !isMigrationDone(session.user.id)) {
          const localRows = getLocalMigrationRows()
          if (localRows.length) {
            const migrate = window.confirm(`Encontramos ${localRows.length} movimentações antigas neste navegador. Deseja copiá-las para sua conta agora? O backup local será preservado.`)
            if (migrate) {
              finalRows = await saveManyTransactions(localRows, rows)
              markMigrationDone(session.user.id)
            }
          }
        }
        if (!active) return
        setTransactions(finalRows)
        const hasIncome = finalRows.some((row) => row.type === 'receita')
        setShowOnboarding(!isOnboarded(session?.user?.id || 'demo') && !hasIncome)
      })
      .catch((err) => active && setError(err?.message || 'Falha ao carregar dados.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [session, authReady])

  useEffect(() => {
    if (!authReady || !isSupabaseConfigured || !session?.access_token) {
      setRecurrenceRules([])
      return undefined
    }
    let active = true
    const reloadRules = () => recurrenceRepository.list()
      .then((rows) => { if (active) setRecurrenceRules(rows) })
      .catch((err) => { if (active) setError(err?.message || 'Não foi possível carregar recorrências.') })
    reloadRules()
    const onDataChanged = (event) => {
      if (event?.detail?.table === 'recurrence_rules') reloadRules()
    }
    window.addEventListener('uaiconta:data-changed', onDataChanged)
    return () => { active = false; window.removeEventListener('uaiconta:data-changed', onDataChanged) }
  }, [session, authReady])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  const projectedTransactions = useMemo(() => {
    if (!recurrenceRules.length) return []
    const startKey = addMonthsToKey(period, -11)
    const endKey = addMonthsToKey(period, 12)
    const startDate = `${startKey}-01`
    const [endYear, endMonth] = endKey.split('-').map(Number)
    const endDate = new Date(endYear, endMonth, 0).toISOString().slice(0, 10)
    const realizedKeys = new Set(transactions
      .filter((row) => row.recurrenceId && row.occurrenceDate)
      .map((row) => recurrenceOccurrenceKey(row.recurrenceId, row.occurrenceDate)))
    return recurrenceRules
      .flatMap((rule) => projectRecurrence(rule, startDate, endDate))
      .filter((row) => !realizedKeys.has(recurrenceOccurrenceKey(row.recurrenceId, row.occurrenceDate)))
  }, [recurrenceRules, transactions, period])

  const financialRows = useMemo(() => [...transactions, ...projectedTransactions], [transactions, projectedTransactions])
  const metrics = useMemo(() => calculatePeriodMetrics(financialRows, period), [financialRows, period])
  const monthlySeries = useMemo(() => buildMonthlySeries(financialRows, period, 6), [financialRows, period])
  const currentRows = useMemo(() => periodTransactions(financialRows, period).sort((a, b) => b.date.localeCompare(a.date)), [financialRows, period])

  function notify(message, type = 'success') { setToast({ message, type }) }

  async function handleSave(tx) {
    try {
      let next = await saveTransaction({ ...tx, status: tx.status || 'completed' }, transactions)
      if (isSupabaseConfigured && tx.isRecurring && tx.type !== 'transferencia' && !tx.recurrenceId) {
        const rule = await recurrenceRepository.createFromTransaction(tx)
        next = await saveTransaction({ ...tx, recurrenceId: rule.id, occurrenceDate: tx.date, status: tx.status || 'completed' }, next)
        setRecurrenceRules((current) => [rule, ...current])
      }
      setTransactions(next)
      setFormState(null)
      notify(tx.__duplicate ? 'Movimentação duplicada.' : 'Movimentação salva.')
    } catch (err) {
      notify(err?.message || 'Não foi possível salvar.', 'error')
      throw err
    }
  }

  async function handleResolvePlanned(tx, status) {
    const label = status === 'completed' ? 'confirmar como realizada' : 'pular esta ocorrência'
    if (!window.confirm(`Deseja ${label}? A regra de recorrência continuará ativa.`)) return
    try {
      const { id: _virtualId, ...base } = tx
      const next = await saveTransaction({ ...base, id: undefined, status, source: 'recorrencia', isRecurring: true }, transactions)
      setTransactions(next)
      notify(status === 'completed' ? 'Ocorrência confirmada como realizada.' : 'Ocorrência ignorada neste período.')
    } catch (err) { notify(err?.message || 'Não foi possível atualizar a ocorrência.', 'error') }
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir esta movimentação? Essa ação não pode ser desfeita.')) return
    try {
      const next = await deleteTransaction(id, transactions)
      setTransactions(next)
      notify('Movimentação excluída.')
    } catch (err) { notify(err?.message || 'Não foi possível excluir.', 'error') }
  }

  function handleDuplicate(tx) {
    setFormState({ ...tx, id: undefined, __duplicate: true, description: `${tx.description} (cópia)` })
  }

  async function handleImport(rows) {
    try {
      const next = await saveManyTransactions(rows, transactions)
      setTransactions(next)
      notify(`${rows.length} movimentações importadas.`)
    } catch (err) {
      notify(err?.message || 'Não foi possível importar os lançamentos.', 'error')
      throw err
    }
  }

  async function finishOnboarding(rows) {
    try {
      let next = await saveManyTransactions(rows.map((row) => ({ ...row, status: 'completed' })), transactions)
      if (isSupabaseConfigured) {
        for (const row of rows.filter((item) => item.isRecurring && item.type !== 'transferencia')) {
          const rule = await recurrenceRepository.createFromTransaction(row)
          next = await saveTransaction({ ...row, recurrenceId: rule.id, occurrenceDate: row.date, status: 'completed' }, next)
          setRecurrenceRules((current) => [rule, ...current])
        }
      }
      setTransactions(next)
      markOnboarded(session?.user?.id || 'demo')
      setShowOnboarding(false)
      notify('Renda cadastrada. Seu painel já foi recalculado.')
    } catch (err) { notify(err?.message || 'Não foi possível salvar sua renda.', 'error') }
  }

  function skipOnboarding() {
    markOnboarded(session?.user?.id || 'demo')
    setShowOnboarding(false)
  }

  async function handleSignOut() {
    try { await signOut() } finally { setSession(null); setTransactions([]) }
  }

  if (!authReady) return <div className="app-loader"><div className="loader-orb"/><IconLoader2 size={22} className="spin"/><span>Verificando sua sessão...</span></div>

  if (location.pathname === ROUTES.resetPassword) return <ResetPasswordPage />

  if (dataMode === 'unavailable') {
    return <main className="auth-page"><section className="auth-card"><div><span className="eyebrow">Configuração necessária</span><h2>Conecte o UaiConta ao Supabase</h2><p>Este ambiente não possui backend configurado. Em produção o app não usa fallback silencioso para armazenamento local.</p></div><div className="inline-alert">Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. Para desenvolvimento, o modo demo só é ativado explicitamente com VITE_ENABLE_DEMO_MODE=true.</div></section></main>
  }

  if (isSupabaseConfigured && !session?.access_token) return <AuthScreen onAuthenticated={setSession} />

  if (loading) return <div className="app-loader"><div className="loader-orb"/><IconLoader2 size={22} className="spin"/><span>Preparando seu painel...</span></div>

  return (
    <div className="app-shell">
      <Sidebar onAdd={() => setFormState({})} />
      <div className="app-column">
        <header className="topbar">
          <div className="topbar-title"><span>Receitas</span><strong>{periodLabel(period)}</strong></div>
          <PeriodSelector value={period} onChange={setPeriod} />
          <button className="top-add" onClick={() => setFormState({})}><IconPlus size={17}/> <span>Adicionar</span></button>
        </header>
        {error && <div className="global-alert"><IconAlertCircle size={17}/><span>{error}</span><button onClick={() => setError('')}>Fechar</button></div>}
        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to={ROUTES.dashboard} replace />} />
            <Route path={ROUTES.dashboard} element={<DashboardPage metrics={metrics} monthlySeries={monthlySeries} recentTransactions={currentRows} onEdit={setFormState} onAdd={() => setFormState({})} />} />
            <Route path={ROUTES.transactions} element={<TransactionsPage transactions={financialRows} period={period} onEdit={setFormState} onDuplicate={handleDuplicate} onDelete={handleDelete} onResolvePlanned={handleResolvePlanned} onAdd={() => setFormState({})} />} />
            <Route path={ROUTES.analytics} element={<AnalyticsPage metrics={metrics} monthlySeries={monthlySeries} />} />
            <Route path={ROUTES.more} element={<MorePage onImportPdf={() => setPdfOpen(true)} session={session} onSignOut={handleSignOut} />} />
            <Route path={ROUTES.income} element={<DetailPage kind="receitas" metrics={metrics} transactions={currentRows} onEdit={setFormState} />} />
            <Route path={ROUTES.expenses} element={<DetailPage kind="despesas" metrics={metrics} transactions={currentRows} onEdit={setFormState} />} />
            <Route path={ROUTES.investments} element={<DetailPage kind="investimentos" metrics={metrics} transactions={currentRows} onEdit={setFormState} />} />
            <Route path={ROUTES.savings} element={<DetailPage kind="economia" metrics={metrics} transactions={currentRows} onEdit={setFormState} />} />
            <Route path={ROUTES.accounts} element={<AccountsPage />} />
            <Route path={ROUTES.cards} element={<CardsPage />} />
            <Route path={ROUTES.categories} element={<CategoriesPage />} />
            <Route path={ROUTES.incomeSources} element={<IncomeSourcesPage />} />
            <Route path={ROUTES.recurrences} element={<RecurrencesPage />} />
            <Route path={ROUTES.budgets} element={<BudgetsPage />} />
            <Route path={ROUTES.goals} element={<GoalsPage />} />
            <Route path={ROUTES.receipts} element={<ReceiptsPage />} />
            <Route path={ROUTES.preferences} element={<PreferencesPage />} />
            <Route path={ROUTES.privacy} element={<DataPrivacyPage mode="privacy" />} />
            <Route path={ROUTES.data} element={<DataPrivacyPage mode="data" onAccountDeleted={() => { setSession(null); setTransactions([]) }} />} />
            <Route path={ROUTES.security} element={<DataPrivacyPage mode="security" />} />
            <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
          </Routes>
        </main>
      </div>
      <MobileNav onAdd={() => setFormState({})} />

      {formState !== null && <TransactionForm initial={formState?.id || formState?.__duplicate ? formState : null} onCancel={() => setFormState(null)} onSave={handleSave} onImportPdf={() => setPdfOpen(true)} />}
      {pdfOpen && <PdfImportModal existingTransactions={transactions} onClose={() => setPdfOpen(false)} onImport={handleImport} />}
      {showOnboarding && <IncomeOnboarding onFinish={finishOnboarding} onSkip={skipOnboarding} />}
      {toast && <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}>{toast.type === 'error' ? <IconAlertCircle size={17}/> : <IconCircleCheck size={17}/>}<span>{toast.message}</span></div>}
    </div>
  )
}
