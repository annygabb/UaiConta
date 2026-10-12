export interface DraftData { type: 'despesa'|'receita'; amount_cents: number|null; description:string; transaction_date:string; category:string; payment_method:string; confidence:'alta'|'media'|'baixa' }
const clean = (value:string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
export function interpret(text:string, now=new Date()):DraftData {
  const value=clean(text); const type=/recebi|recebido|entrou|ganhei|salario/.test(value)?'receita':'despesa'
  const match=text.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:[.,]\d{1,2})?)/i)
  const amount_cents=match?Math.round(Number(match[1].replace(/\./g,'').replace(',','.'))*100):null
  const dm=text.match(/\b(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?\b/); let year=dm?.[3]?Number(dm[3]):now.getUTCFullYear(); if(year<100)year+=2000
  const transaction_date=dm?`${year}-${String(Number(dm[2])).padStart(2,'0')}-${String(Number(dm[1])).padStart(2,'0')}`:now.toISOString().slice(0,10)
  const category=/mercado|supermercado/.test(value)?'Supermercado':/farmacia|drogaria/.test(value)?'Saúde':/uber|posto|combustivel/.test(value)?'Transporte':type==='receita'?'Outras receitas':'Não categorizado'
  const description=text.replace(/(?:r\$\s*)?\d+(?:[.,]\d{1,2})?/gi,' ').replace(/\b(recebi|paguei|gastei|pix|de|no|na|em)\b/gi,' ').replace(/\s+/g,' ').trim()||(type==='receita'?'Receita pelo WhatsApp':'Despesa pelo WhatsApp')
  return {type,amount_cents,description:description.slice(0,160),transaction_date,category,payment_method:/\bpix\b/i.test(text)?'Pix':'Não identificado',confidence:amount_cents?'media':'baixa'}
}
export function reply(d:DraftData){const amount=d.amount_cents==null?'valor não identificado':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(d.amount_cents/100);return `${d.type==='receita'?'Receita':'Despesa'}: ${amount}\n${d.description}\nData: ${d.transaction_date}\nCategoria: ${d.category}\n\n1 Confirmar\n2 Ignorar\n3 Corrigir informações`}
