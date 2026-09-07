import React, { useState } from 'react'
import { IconCode, IconDatabaseExport, IconFileText, IconLock, IconShieldCheck, IconTable, IconTrash } from '@tabler/icons-react'
import { deleteOwnAccount } from '../../dataService.js'
import { downloadExcel, downloadJson, downloadPdf, exportOwnData } from '../../features/data/export.ts'
import { isSupabaseConfigured } from '../../infrastructure/supabase/client.ts'

const formats = [
  { id: 'json', title: 'JSON', icon: IconCode, text: 'Backup técnico completo, ideal para restaurar ou processar os dados.' },
  { id: 'pdf', title: 'PDF', icon: IconFileText, text: 'Relatório legível com resumo e suas movimentações para guardar ou consultar.' },
  { id: 'excel', title: 'Excel', icon: IconTable, text: 'Planilha com as tabelas separadas para filtrar, organizar e analisar.' },
]

export default function DataPrivacyPage({ mode = 'privacy', onAccountDeleted }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [format, setFormat] = useState('pdf')

  if (mode === 'privacy') return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">LGPD e transparência</span><h1>Privacidade</h1><p>O UaiConta trata movimentações e documentos financeiros como dados privados. O acesso remoto depende de autenticação e RLS.</p></div></div><div className="dashboard-grid dashboard-grid-secondary"><section className="panel"><div className="settings-status"><IconShieldCheck size={22}/><div><strong>Isolamento por usuário</strong><p>As policies impedem leitura, edição e exclusão de linhas de outro usuário.</p></div></div></section><section className="panel"><div className="settings-status"><IconLock size={22}/><div><strong>Documentos privados</strong><p>Notas e comprovantes ficam em bucket privado e são acessados por sessão autenticada ou URL assinada de curta duração.</p></div></div></section></div></div>

  if (mode === 'security') return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">Proteção da conta</span><h1>Segurança</h1><p>Sessões são gerenciadas pelo Supabase Auth. A chave service role nunca faz parte do bundle do navegador.</p></div></div><section className="panel"><div className="settings-status"><IconShieldCheck size={22}/><div><strong>{isSupabaseConfigured ? 'Backend seguro configurado' : 'Backend não configurado'}</strong><p>RLS, Storage Policies, CSP e validações formam camadas independentes de proteção.</p></div></div></section></div>

  async function exportData() {
    setBusy(true); setMessage('')
    try {
      const data = await exportOwnData()
      if (format === 'json') downloadJson(data)
      else if (format === 'excel') downloadExcel(data)
      else await downloadPdf(data)
      setMessage(`Exportação ${format === 'excel' ? 'Excel' : format.toUpperCase()} gerada no seu dispositivo.`)
    } catch (err) { setMessage(err?.message || 'Não foi possível exportar os dados.') }
    finally { setBusy(false) }
  }

  async function removeAccount() {
    const phrase = window.prompt('Esta ação é definitiva. Digite EXCLUIR MINHA CONTA para confirmar.')
    if (phrase !== 'EXCLUIR MINHA CONTA') return
    if (!window.confirm('Confirma a exclusão definitiva da conta, dados financeiros e documentos?')) return
    setBusy(true); setMessage('')
    try { await deleteOwnAccount(); setMessage('Conta excluída.'); onAccountDeleted?.() }
    catch (err) { setMessage(err?.message || 'Não foi possível excluir a conta.') }
    finally { setBusy(false) }
  }

  return <div className="page-stack data-page-v6">
    <div className="page-intro"><div><span className="eyebrow">Seus dados</span><h1>Dados e backup</h1><p>Escolha o formato que faz mais sentido para você. A exportação é preparada a partir dos dados que sua própria sessão pode acessar.</p></div></div>
    {message&&<div className="inline-alert">{message}</div>}

    <section className="panel export-panel-v6">
      <div className="panel-head"><div><h2>Exportar meus dados</h2><p>JSON para backup, PDF para leitura ou Excel para análise.</p></div><IconDatabaseExport size={23}/></div>
      <div className="export-format-grid" role="radiogroup" aria-label="Formato de exportação">
        {formats.map(({ id, title, text, icon: Icon }) => <button type="button" role="radio" aria-checked={format === id} className={`export-format-card ${format === id ? 'active' : ''}`} key={id} onClick={() => setFormat(id)}>
          <span className="export-format-icon"><Icon size={21}/></span>
          <span><strong>{title}</strong><small>{text}</small></span>
          <i aria-hidden="true" />
        </button>)}
      </div>
      <div className="export-actions-v6"><p>O arquivo é gerado para download no dispositivo. Seus documentos originais não são incluídos dentro do relatório PDF.</p><button className="primary-btn" onClick={exportData} disabled={busy}><IconDatabaseExport size={17}/> {busy ? 'Preparando...' : `Exportar ${format === 'excel' ? 'Excel' : format.toUpperCase()}`}</button></div>
    </section>

    <section className="panel danger-zone data-danger-v6">
      <div className="settings-status"><IconTrash size={22}/><div><strong>Excluir conta definitivamente</strong><p>A Edge Function remove seus arquivos privados, revoga sessões e exclui o usuário do Auth. A exclusão em cascata remove as linhas financeiras.</p><button className="danger-btn" onClick={removeAccount} disabled={busy}>Excluir minha conta</button></div></div>
    </section>
  </div>
}
