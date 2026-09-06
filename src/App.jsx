import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus } from "lucide-react";
import { ROUTES } from "./constants.js";
import { buildMonthlySeries, calculatePeriodMetrics, periodTransactions } from "./finance.js";
import { monthKey } from "./utils.js";
import { useRoute } from "./router.js";
import {
  dataMode,
  deleteTransaction,
  getLocalMigrationRows,
  getStoredSession,
  isMigrationDone,
  isOnboarded,
  isSupabaseConfigured,
  loadTransactions,
  markMigrationDone,
  markOnboarded,
  resetLocalData,
  saveManyTransactions,
  saveTransaction,
  signOut,
} from "./dataService.js";
import { MobileNav, Sidebar } from "./components/Navigation.jsx";
import { PeriodSelector } from "./components/Common.jsx";
import TransactionForm from "./components/TransactionForm.jsx";
import PdfImportModal from "./components/PdfImportModal.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import IncomeOnboarding from "./components/IncomeOnboarding.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import TransactionsPage from "./pages/TransactionsPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import MorePage from "./pages/MorePage.jsx";
import DetailPage from "./pages/DetailPage.jsx";

export default function UaiConta() {
  const route = useRoute();
  const [session, setSession] = useState(() => getStoredSession());
  const [transactions, setTransactions] = useState([]);
  const [period, setPeriod] = useState(() => monthKey(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [formState, setFormState] = useState(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured && !session?.access_token) {
      setLoading(false);
      setTransactions([]);
      return;
    }
    let active = true;
    setLoading(true);
    loadTransactions(session)
      .then(async (rows) => {
        if (!active) return;
        let finalRows = rows;
        if (isSupabaseConfigured && session?.user?.id && !isMigrationDone(session.user.id)) {
          const localRows = getLocalMigrationRows();
          if (localRows.length) {
            const migrate = window.confirm(`Encontramos ${localRows.length} movimentações salvas localmente neste navegador. Deseja copiá-las para sua conta do Supabase agora? O backup local será mantido.`);
            if (migrate) {
              finalRows = await saveManyTransactions(localRows, rows, session);
              markMigrationDone(session.user.id);
            }
          }
        }
        if (!active) return;
        setTransactions(finalRows);
        const hasIncome = finalRows.some((row) => row.type === "receita");
        setShowOnboarding(!isOnboarded(session?.user?.id || "local") && !hasIncome);
      })
      .catch((err) => active && setError(err?.message || "Falha ao carregar dados."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const metrics = useMemo(() => calculatePeriodMetrics(transactions, period), [transactions, period]);
  const monthlySeries = useMemo(() => buildMonthlySeries(transactions, period, 6), [transactions, period]);
  const currentRows = useMemo(() => periodTransactions(transactions, period).sort((a, b) => b.date.localeCompare(a.date)), [transactions, period]);

  function notify(message, type = "success") { setToast({ message, type }); }

  async function handleSave(tx) {
    try {
      const next = await saveTransaction(tx, transactions, session);
      setTransactions(next);
      setFormState(null);
      notify(tx.__duplicate ? "Movimentação duplicada." : "Movimentação salva.");
    } catch (err) {
      notify(err?.message || "Não foi possível salvar.", "error");
      throw err;
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Excluir esta movimentação? Essa ação não pode ser desfeita.")) return;
    try {
      const next = await deleteTransaction(id, transactions, session);
      setTransactions(next);
      notify("Movimentação excluída.");
    } catch (err) { notify(err?.message || "Não foi possível excluir.", "error"); }
  }

  function handleDuplicate(tx) {
    setFormState({ ...tx, id: undefined, __duplicate: true, description: `${tx.description} (cópia)` });
  }

  async function handleImport(rows) {
    try {
      const next = await saveManyTransactions(rows, transactions, session);
      setTransactions(next);
      notify(`${rows.length} movimentações importadas.`);
    } catch (err) {
      notify(err?.message || "Não foi possível importar os lançamentos.", "error");
      throw err;
    }
  }

  async function finishOnboarding(rows) {
    try {
      const next = await saveManyTransactions(rows, transactions, session);
      setTransactions(next);
      markOnboarded(session?.user?.id || "local");
      setShowOnboarding(false);
      notify("Renda cadastrada. Seu painel já foi recalculado.");
    } catch (err) { notify(err?.message || "Não foi possível salvar sua renda.", "error"); }
  }

  function skipOnboarding() {
    markOnboarded(session?.user?.id || "local");
    setShowOnboarding(false);
  }

  async function handleSignOut() {
    await signOut();
    setSession(null);
    setTransactions([]);
  }

  function handleReset() {
    if (dataMode !== "local") {
      notify("A limpeza em massa do banco remoto não é executada por segurança. Exclua os itens individualmente.", "error");
      return;
    }
    if (!window.confirm("Apagar todos os dados locais do UaiConta neste navegador?")) return;
    resetLocalData();
    setTransactions([]);
    setShowOnboarding(true);
    notify("Dados locais removidos.");
  }

  if (isSupabaseConfigured && !session?.access_token) {
    return <AuthScreen onAuthenticated={(nextSession) => setSession(nextSession)} />;
  }

  if (loading) {
    return <div className="app-loader"><div className="loader-orb"/><Loader2 size={22} className="spin"/><span>Preparando seu painel...</span></div>;
  }

  const renderRoute = () => {
    if (route === ROUTES.transactions) return <TransactionsPage transactions={transactions} period={period} onEdit={setFormState} onDuplicate={handleDuplicate} onDelete={handleDelete} onAdd={() => setFormState({})} />;
    if (route === ROUTES.analytics) return <AnalyticsPage metrics={metrics} monthlySeries={monthlySeries} />;
    if (route === ROUTES.more) return <MorePage onImportPdf={() => setPdfOpen(true)} onReset={handleReset} session={session} onSignOut={handleSignOut} />;
    if (route === ROUTES.income) return <DetailPage kind="receitas" metrics={metrics} transactions={currentRows} onEdit={setFormState} />;
    if (route === ROUTES.expenses) return <DetailPage kind="despesas" metrics={metrics} transactions={currentRows} onEdit={setFormState} />;
    if (route === ROUTES.investments) return <DetailPage kind="investimentos" metrics={metrics} transactions={currentRows} onEdit={setFormState} />;
    if (route === ROUTES.savings) return <DetailPage kind="economia" metrics={metrics} transactions={currentRows} onEdit={setFormState} />;
    return <DashboardPage metrics={metrics} monthlySeries={monthlySeries} recentTransactions={currentRows} onEdit={setFormState} onAdd={() => setFormState({})} />;
  };

  return (
    <div className="app-shell">
      <Sidebar route={route} onAdd={() => setFormState({})} />
      <div className="app-column">
        <header className="topbar">
          <div className="topbar-title"><span>Receitas</span><strong>{period.split("-")[0]}</strong></div>
          <PeriodSelector value={period} onChange={setPeriod} />
          <button className="top-add" onClick={() => setFormState({})}><Plus size={17}/> <span>Adicionar</span></button>
        </header>
        {error && <div className="global-alert"><AlertCircle size={17}/><span>{error}</span><button onClick={() => setError("")}>Fechar</button></div>}
        <main className="content">{renderRoute()}</main>
      </div>
      <MobileNav route={route} onAdd={() => setFormState({})} />

      {formState !== null && <TransactionForm initial={formState?.id || formState?.__duplicate ? formState : null} onCancel={() => setFormState(null)} onSave={handleSave} onImportPdf={() => setPdfOpen(true)} />}
      {pdfOpen && <PdfImportModal existingTransactions={transactions} onClose={() => setPdfOpen(false)} onImport={handleImport} />}
      {showOnboarding && <IncomeOnboarding onFinish={finishOnboarding} onSkip={skipOnboarding} />}
      {toast && <div className={`toast ${toast.type === "error" ? "toast-error" : ""}`}>{toast.type === "error" ? <AlertCircle size={17}/> : <CheckCircle2 size={17}/>}<span>{toast.message}</span></div>}
    </div>
  );
}
