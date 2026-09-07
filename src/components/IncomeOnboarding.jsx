import React, { useState } from 'react'
import { IconArrowRight, IconCashBanknote, IconCoin, IconPlus, IconX } from '@tabler/icons-react'
import { currencyInput, isoDate, parseCurrencyInput, uid } from '../utils.js'
import PurpleCheckbox from './ui/PurpleCheckbox.jsx'
import TextScramble from './ui/TextScramble.jsx'

export default function IncomeOnboarding({ onFinish, onSkip }) {
  const [sources, setSources] = useState([{ id: uid(), name: 'Salário', amount: '' }])
  const [variable, setVariable] = useState(false)

  const update = (id, patch) => setSources((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
  const total = sources.reduce((sum, item) => sum + parseCurrencyInput(item.amount), 0)
  const valid = total > 0

  function submit() {
    const date = isoDate(new Date())
    const txs = sources.filter((item) => parseCurrencyInput(item.amount) > 0).map((item) => ({
      id: uid(),
      type: 'receita',
      amount: parseCurrencyInput(item.amount),
      description: item.name.trim() || 'Receita',
      category: item.name.toLowerCase().includes('freela') ? 'Freelance' : 'Salário',
      paymentMethod: 'Pix',
      date,
      isRecurring: !variable,
      notes: variable ? 'Renda informada como variável no onboarding' : 'Renda mensal cadastrada no onboarding',
      source: 'onboarding',
      confidence: 'alta',
    }))
    onFinish(txs)
  }

  return <div className="modal-backdrop"><section className="onboarding-card" role="dialog" aria-modal="true"><button className="onboarding-close" onClick={onSkip} aria-label="Pular onboarding"><IconX size={18}/></button><div className="onboarding-icon"><IconCashBanknote size={23}/></div><span className="eyebrow">Primeiro, sua renda</span><h2><TextScramble text="Quanto você recebe?" /></h2><p>Com a renda cadastrada, o UaiConta calcula automaticamente quanto já foi comprometido, a sobra atual e a projeção do mês.</p><div className="income-source-list">{sources.map((source,index)=><div className="income-source" key={source.id}><label><span>Fonte {index+1}</span><input value={source.name} onChange={(e)=>update(source.id,{name:e.target.value})} placeholder="Ex: Salário"/></label><label><span>Valor mensal</span><div className="money-field"><span>R$</span><input inputMode="numeric" value={source.amount} onChange={(e)=>update(source.id,{amount:currencyInput(parseCurrencyInput(e.target.value))})} placeholder="0,00"/></div></label>{sources.length>1&&<button aria-label="Remover fonte" onClick={()=>setSources((current)=>current.filter((item)=>item.id!==source.id))}><IconX size={16}/></button>}</div>)}</div><button className="add-source" onClick={()=>setSources((current)=>[...current,{id:uid(),name:'Freelance',amount:''}])}><IconPlus size={16}/> Adicionar outra fonte de renda</button><div className="toggle-field onboarding-toggle purple-toggle-field"><PurpleCheckbox checked={variable} onCheckedChange={setVariable} label="Minha renda varia de mês para mês" description="O valor acima será usado como referência inicial." ariaLabel="Marcar renda como variável" /></div><div className="onboarding-total"><span>Receita cadastrada</span><strong>R$ {total.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div><button className="primary-btn onboarding-next" disabled={!valid} onClick={submit}><IconCoin size={17}/> Começar meu painel <IconArrowRight size={17}/></button><button className="skip-btn" onClick={onSkip}>Prefiro cadastrar depois</button></section></div>
}
