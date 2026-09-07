import React from 'react'
import { Link } from 'react-router-dom'
import {
  IconCategory,
  IconChartPie,
  IconCreditCard,
  IconDatabase,
  IconFileInvoice,
  IconLock,
  IconReceipt,
  IconSettings,
  IconShieldCheck,
  IconTargetArrow,
  IconWallet,
} from '@tabler/icons-react'
import { ROUTES } from '../constants.js'
import { Panel } from '../components/Common.jsx'

const items = [
  { icon: IconWallet, title: 'Contas', text: 'Organize onde seu dinheiro fica.', to: ROUTES.accounts },
  { icon: IconCreditCard, title: 'Cartões', text: 'Limites, fechamento, vencimento e parcelas.', to: ROUTES.cards },
  { icon: IconCategory, title: 'Categorias', text: 'Crie categorias próprias para análises melhores.', to: ROUTES.categories },
  { icon: IconReceipt, title: 'Rendas', text: 'Edite salário, freelance e outras fontes.', to: ROUTES.incomeSources },
  { icon: IconSettings, title: 'Recorrências', text: 'Planeje receitas, despesas e aportes futuros.', to: ROUTES.recurrences },
  { icon: IconChartPie, title: 'Orçamentos', text: 'Defina limites e acompanhe o que já foi usado.', to: ROUTES.budgets },
  { icon: IconTargetArrow, title: 'Metas', text: 'Acompanhe objetivos e reservas.', to: ROUTES.goals },
  { icon: IconFileInvoice, title: 'Notas e comprovantes', text: 'PDF, imagem, câmera e original privado.', to: ROUTES.receipts },
  { icon: IconSettings, title: 'Preferências', text: 'Experiência, período e configurações.', to: ROUTES.preferences },
  { icon: IconDatabase, title: 'Dados e backup', text: 'Exporte dados ou exclua sua conta.', to: ROUTES.data },
  { icon: IconLock, title: 'Privacidade', text: 'Entenda como seus dados são protegidos.', to: ROUTES.privacy },
  { icon: IconShieldCheck, title: 'Segurança', text: 'Sessão, RLS, Storage e proteções do app.', to: ROUTES.security },
]

export default function MorePage({ onImportPdf, session, onSignOut }) {
  return <div className="page-stack">
    <div className="page-intro"><div><span className="eyebrow">Configurações e recursos</span><h1>Mais</h1><p>Gerencie documentos, planejamento, preferências, privacidade e segurança sem misturar configurações técnicas com o uso diário.</p></div></div>

    <div className="more-grid">
      <button className="more-card featured" onClick={onImportPdf}><span><IconFileInvoice size={21}/></span><div><strong>Importar arquivos</strong><p>PDF, imagem ou CSV. O rascunho é preservado e as categorias são sugeridas para sua revisão.</p></div></button>
      {items.map(({icon:Icon,title,text,to})=><Link className="more-card" key={to} to={to}><span><Icon size={21}/></span><div><strong>{title}</strong><p>{text}</p></div></Link>)}
    </div>

    <div className="dashboard-grid dashboard-grid-secondary more-session-grid">
      <Panel title="Sessão" subtitle={session?.user?.email || 'Modo demo'}>
        <div className="settings-actions">{session ? <button className="ghost-btn" onClick={onSignOut}><IconLock size={16}/> Sair de todos os dispositivos</button> : <span className="muted-copy">Entre em uma conta para sincronizar seus dados.</span>}</div>
      </Panel>
      <Panel title="Importação que continua" subtitle="Você pode fechar e voltar depois">
        <p className="muted-copy">Arquivos selecionados para importação ficam em um rascunho local do navegador até você importar ou descartar.</p>
      </Panel>
    </div>
  </div>
}
