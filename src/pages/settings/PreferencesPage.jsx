import React, { useEffect, useState } from 'react'
import { IconMoon, IconRefresh, IconSparkles, IconUser } from '@tabler/icons-react'
import PurpleCheckbox from '../../components/ui/PurpleCheckbox.jsx'
import TextScramble from '../../components/ui/TextScramble.jsx'
import { profileRepository } from '../../features/profile/profile.repository.ts'

export default function PreferencesPage() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false)
  const [compact, setCompact] = useState(false)
  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    profileRepository.getDisplayName().then(setName).catch(() => {})
  }, [])

  async function saveName(event) {
    event.preventDefault()
    const clean = name.trim()
    if (!clean || savingName) return
    setSavingName(true)
    setMessage('')
    try {
      const saved = await profileRepository.saveDisplayName(clean)
      setName(saved)
      window.dispatchEvent(new CustomEvent('uaiconta:profile-changed', { detail: { displayName: saved } }))
      setMessage('Nome atualizado no painel.')
    } catch (err) {
      setMessage(err?.message || 'Não foi possível atualizar seu nome.')
    } finally {
      setSavingName(false)
    }
  }

  return <div className="page-stack">
    <div className="page-intro"><div><span className="eyebrow">Experiência</span><h1><TextScramble text="Preferências" /></h1><p>Personalize como o UaiConta se apresenta para você sem comprometer seus dados financeiros.</p></div></div>
    <div className="dashboard-grid dashboard-grid-secondary">
      <section className="panel profile-preference-panel"><div className="settings-status"><IconUser size={22}/><div><strong>Seu nome no UaiConta</strong><p>Usado na saudação do dashboard e na navegação. Ao entrar novamente, o sistema confirma o nome com você.</p></div></div><form className="profile-name-form" onSubmit={saveName}><input value={name} onChange={(event)=>setName(event.target.value)} maxLength={60} autoComplete="name" placeholder="Seu nome"/><button className="primary-btn" disabled={!name.trim()||savingName}>{savingName?'Salvando...':'Salvar nome'}</button></form>{message&&<small className="preference-message">{message}</small>}</section>
      <section className="panel"><div className="settings-status"><IconMoon size={22}/><div><strong>Tema Moon</strong><p>O tema dark permanece como identidade principal do UaiConta V4.</p></div></div></section>
      <section className="panel"><div className="settings-status"><IconSparkles size={22}/><div><strong>Movimento reduzido</strong><p>Os novos efeitos também respeitam a preferência de movimento reduzido do sistema.</p><div className="preference-checkbox"><PurpleCheckbox checked={reduced} onCheckedChange={setReduced} label={reduced?'Reduzido':'Padrão'} ariaLabel="Alternar movimento reduzido" /></div></div></div></section>
      <section className="panel"><div className="settings-status"><IconRefresh size={22}/><div><strong>Densidade</strong><p>Alterne entre leitura confortável e compacta.</p><div className="preference-checkbox"><PurpleCheckbox checked={compact} onCheckedChange={setCompact} label={compact?'Compacta':'Confortável'} ariaLabel="Alternar densidade" /></div></div></div></section>
    </div>
  </div>
}
