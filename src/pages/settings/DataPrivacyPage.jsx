import React, { useState } from 'react'
import { IconDatabaseExport, IconLock, IconShieldCheck, IconTrash } from '@tabler/icons-react'
import { deleteOwnAccount } from '../../dataService.js'
import { downloadJson, exportOwnData } from '../../features/data/export.ts'
import { isSupabaseConfigured } from '../../infrastructure/supabase/client.ts'

export default function DataPrivacyPage({ mode = 'privacy', onAccountDeleted }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  if (mode === 'privacy') return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">LGPD e transparência</span><h1>Privacidade</h1><p>O UaiConta trata movimentações e documentos financeiros como dados privados. O acesso remoto depende de autenticação e RLS.</p></div></div><div className="dashboard-grid dashboard-grid-secondary"><section className="panel"><div className="settings-status"><IconShieldCheck size={22}/><div><strong>Isolamento por usuário</strong><p>As policies impedem leitura, edição e exclusão de linhas de outro usuário.</p></div></div></section><section className="panel"><div className="settings-status"><IconLock size={22}/><div><strong>Documentos privados</strong><p>Notas e comprovantes ficam em bucket privado e são acessados por sessão autenticada ou URL assinada de curta duração.</p></div></div></section></div></div>

  if (mode === 'security') return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">Proteção da conta</span><h1>Segurança</h1><p>Sessões são gerenciadas pelo Supabase Auth. A chave service role nunca faz parte do bundle do navegador.</p></div></div><section className="panel"><div className="settings-status"><IconShieldCheck size={22}/><div><strong>{isSupabaseConfigured ? 'Backend seguro configurado' : 'Backend não configurado'}</strong><p>RLS, Storage Policies, CSP e validações formam camadas independentes de proteção.</p></div></div></section></div>

  async function exportData() {
    setBusy(true); setMessage('')
    try { downloadJson(await exportOwnData()); setMessage('Backup JSON gerado no seu dispositivo.') }
    catch (err) { setMessage(err?.message || 'Não foi possível exportar os dados.') }
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

  return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">Seus dados</span><h1>Dados e backup</h1><p>Exporte uma cópia estruturada ou solicite exclusão definitiva da conta.</p></div></div>{message&&<div className="inline-alert">{message}</div>}<div className="dashboard-grid dashboard-grid-secondary"><section className="panel"><div className="settings-status"><IconDatabaseExport size={22}/><div><strong>Exportar dados</strong><p>Gera um JSON das tabelas que sua própria sessão pode ler.</p><button className="ghost-btn" onClick={exportData} disabled={busy}>Baixar backup</button></div></div></section><section className="panel danger-zone"><div className="settings-status"><IconTrash size={22}/><div><strong>Excluir conta definitivamente</strong><p>A Edge Function remove seus arquivos privados, revoga sessões e exclui o usuário do Auth. A exclusão em cascata remove as linhas financeiras.</p><button className="danger-btn" onClick={removeAccount} disabled={busy}>Excluir minha conta</button></div></div></section></div></div>
}
