import React from "react";
import { Database, FileText, Goal, LockKeyhole, RefreshCcw, Settings, ShieldCheck, Tags, WalletCards } from "lucide-react";
import { dataMode, isSupabaseConfigured } from "../dataService.js";
import { Panel } from "../components/Common.jsx";

const items = [
  { icon: WalletCards, title: "Contas e cartões", text: "Organize as origens e meios de pagamento." },
  { icon: Tags, title: "Categorias", text: "Personalize como suas movimentações são agrupadas." },
  { icon: Goal, title: "Metas", text: "Prepare objetivos de reserva e compras futuras." },
  { icon: Settings, title: "Preferências", text: "Período, experiência e configurações do app." },
];

export default function MorePage({ onImportPdf, onReset, session, onSignOut }) {
  return <div className="page-stack">
    <div className="page-intro"><div><span className="eyebrow">Configurações e recursos</span><h1>Mais</h1><p>Importação, segurança, dados e configurações secundárias do UaiConta.</p></div></div>

    <div className="more-grid">
      <button className="more-card featured" onClick={onImportPdf}><span><FileText size={21}/></span><div><strong>Importar vários PDFs</strong><p>Adicione quantos PDFs quiser, revise os lançamentos e importe em lote.</p></div></button>
      {items.map(({icon:Icon,title,text})=><article className="more-card static" key={title}><span><Icon size={21}/></span><div><strong>{title}</strong><p>{text}</p></div></article>)}
    </div>

    <div className="dashboard-grid dashboard-grid-secondary">
      <Panel title="Dados e banco" subtitle={isSupabaseConfigured ? "Banco Supabase conectado" : "Modo local ativo"}>
        <div className="settings-status"><Database size={20}/><div><strong>{dataMode === "supabase" ? "Supabase + PostgreSQL" : "Armazenamento local de desenvolvimento"}</strong><p>{isSupabaseConfigured ? "Os lançamentos são persistidos no banco e protegidos por RLS." : "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar autenticação e banco real. O app continua funcional localmente para desenvolvimento."}</p></div></div>
      </Panel>
      <Panel title="Segurança" subtitle="Proteções do MVP">
        <div className="settings-status"><ShieldCheck size={20}/><div><strong>{isSupabaseConfigured ? "RLS + sessão protegida" : "Sem sincronização externa"}</strong><p>PDFs são processados localmente. Não há integração Anthropic. O schema inclui isolamento por usuário e políticas RLS.</p></div></div>
      </Panel>
      <Panel title="Sessão" subtitle={session?.user?.email || "Modo local"}>
        <div className="settings-actions">
          {session ? <button className="ghost-btn" onClick={onSignOut}><LockKeyhole size={16}/> Sair da conta</button> : <span className="muted-copy">Autenticação aparece automaticamente quando o Supabase está configurado.</span>}
          <button className="danger-btn" onClick={onReset}><RefreshCcw size={16}/> Limpar dados locais</button>
        </div>
      </Panel>
    </div>
  </div>;
}
