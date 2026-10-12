import { useEffect, useState } from 'react'
import { IconBrandWhatsapp, IconCheck, IconCopy, IconLink, IconLinkOff, IconShieldLock } from '@tabler/icons-react'
import { whatsappRepository } from '../../features/whatsapp/whatsapp.repository'
import { isSupabaseConfigured } from '../../infrastructure/supabase/client'

export default function WhatsAppPage() {
  const [link, setLink] = useState<any>(null), [pairing, setPairing] = useState<any>(null)
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [copied, setCopied] = useState(false)
  const displayNumber = String(import.meta.env.VITE_WHATSAPP_DISPLAY_NUMBER || '').trim()
  useEffect(() => { if (!isSupabaseConfigured) { setLoading(false); return } whatsappRepository.getLink().then(setLink).catch((e)=>setError(e.message)).finally(()=>setLoading(false)) }, [])
  async function generate() { setError(''); try { setPairing(await whatsappRepository.createPairingCode()) } catch(e:any){setError(e.message||'Não foi possível gerar o código.')} }
  async function disconnect(){if(!window.confirm('Desvincular este WhatsApp? Rascunhos e movimentações existentes serão preservados.'))return;try{await whatsappRepository.disconnect();setLink(null);setPairing(null)}catch(e:any){setError(e.message)} }
  async function copy(){if(!pairing)return;await navigator.clipboard.writeText(pairing.code);setCopied(true);setTimeout(()=>setCopied(false),1800)}
  return <div className="page-stack whatsapp-settings">
    <div className="page-intro"><div><span className="eyebrow">Automação pessoal</span><h1>WhatsApp do UaiConta</h1><p>Envie texto, imagem, PDF ou áudio. O UaiConta cria um rascunho e só salva depois da sua confirmação.</p></div></div>
    {error&&<div className="inline-alert">{error}</div>}
    <section className="panel whatsapp-status-card"><span className="whatsapp-status-icon"><IconBrandWhatsapp size={28}/></span><div><strong>{loading?'Verificando...':link?'WhatsApp vinculado':'Nenhum WhatsApp vinculado'}</strong><p>{link?`Número terminado em ${link.phone_last4}. O telefone completo não é exibido nem salvo em texto aberto.`:'Gere um código temporário e envie-o para o número configurado pelo responsável desta instalação.'}</p></div>{link?<button className="ghost-btn" onClick={disconnect}><IconLinkOff size={17}/> Desvincular</button>:<button className="primary-btn" onClick={generate} disabled={!isSupabaseConfigured}><IconLink size={17}/> Gerar código</button>}</section>
    {pairing&&<section className="panel pairing-card"><span className="eyebrow">Válido por 10 minutos</span><h2>{pairing.code}</h2><button className="ghost-btn" onClick={copy}>{copied?<IconCheck size={17}/>:<IconCopy size={17}/>} {copied?'Copiado':'Copiar código'}</button><p>Envie somente esse código {displayNumber?<>para <strong>{displayNumber}</strong></>:<>ao WhatsApp configurado nesta instalação</>}.</p></section>}
    <div className="whatsapp-help-grid"><section className="panel"><IconBrandWhatsapp size={22}/><h2>Como registrar</h2><ol><li>Envie “Paguei 35,90 no mercado por Pix”.</li><li>Confira o rascunho retornado.</li><li>Responda <strong>1</strong> para confirmar, <strong>2</strong> para ignorar ou <strong>3</strong> para corrigir.</li></ol></section><section className="panel"><IconShieldLock size={22}/><h2>Privacidade</h2><p>Arquivos ficam no Storage privado do seu próprio Supabase. Tokens da Meta e chaves administrativas existem somente na Edge Function.</p><p>Mensagens repetidas são ignoradas pelo identificador do webhook.</p></section></div>
  </div>
}
