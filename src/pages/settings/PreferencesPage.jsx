import React, { useState } from 'react'
import { IconMoon, IconRefresh, IconSparkles } from '@tabler/icons-react'

export default function PreferencesPage() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false)
  const [compact, setCompact] = useState(false)

  return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">Experiência</span><h1>Preferências</h1><p>Ajustes de interface locais. Preferências sensíveis continuam no backend quando necessário.</p></div></div><div className="dashboard-grid dashboard-grid-secondary"><section className="panel"><div className="settings-status"><IconMoon size={22}/><div><strong>Tema Moon</strong><p>O tema dark permanece como identidade principal do UaiConta V4.</p></div></div></section><section className="panel"><div className="settings-status"><IconSparkles size={22}/><div><strong>Movimento reduzido</strong><p>Desative animações e profundidade quando preferir uma experiência mais estática.</p><label className="toggle-row"><input type="checkbox" checked={reduced} onChange={(e)=>setReduced(e.target.checked)}/><span>{reduced?'Reduzido':'Padrão'}</span></label></div></div></section><section className="panel"><div className="settings-status"><IconRefresh size={22}/><div><strong>Densidade</strong><p>Alterne entre leitura confortável e compacta.</p><label className="toggle-row"><input type="checkbox" checked={compact} onChange={(e)=>setCompact(e.target.checked)}/><span>{compact?'Compacta':'Confortável'}</span></label></div></div></section></div></div>
}
