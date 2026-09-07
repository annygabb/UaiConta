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
  IconRepeat,
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
  { icon: IconRepeat, title: 'Recorrências', text: 'Veja e gerencie receitas, despesas e aportes recorrentes.', to: ROUTES.recurrences },
  { icon: IconChartPie, title: 'Orçamentos', text: 'Defina limites e acompanhe o que já foi usado.', to: ROUTES.budgets },
  { icon: IconTargetArrow, title: 'Metas', text: 'Acompanhe objetivos e reservas.', to: ROUTES.goals },
  { icon: IconFileInvoice, title: 'Notas e comprovantes', text: 'PDF, imagem, câmera e original privado.', to: ROUTES.receipts },
  { icon: IconDatabase, title: 'Dados e backup', text: 'Exporte em JSON, PDF ou Excel e gerencie sua conta.', to: ROUTES.data },
]

export default function MorePage({ onImportPdf, session, onSignOut }) {
  return <div className="page-stack">
    <div className="page-intro"><div><span className="eyebrow">Organização e recursos</span><h1>Mais</h1><p>Gerencie planejamento, documentos, contas e seus próprios dados sem misturar configurações técnicas com o uso diário.</p></div></div>

    <div className="more-grid">
      <button className="more-card featured" onClick={onImportPdf}><span><IconFileInvoice size={21}/></span><div><strong>Importar arquivos</strong><p>PDF, imagem ou CSV. O rascunho é preservado e as categorias são sugeridas para sua revisão.</p></div></button>
      {items.map(({icon:Icon,title,text,to})=><Link className="more-card" key={to} to={to}><span><Icon size={21}/></span><div><strong>{title}</strong><p>{text}</p></div></Link>)}
    </div>

    <div className="more-session-grid">
      <Panel title="Sessão" subtitle={session?.user?.email || 'Modo demo'}>
        <div className="settings-actions">{session ? <button className="ghost-btn" onClick={onSignOut}><IconLock size={16}/> Sair de todos os dispositivos</button> : <span className="muted-copy">Entre em uma conta para sincronizar seus dados.</span>}</div>
      </Panel>
    </div>
  </div>
}
