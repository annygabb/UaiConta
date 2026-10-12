import { createClient } from 'npm:@supabase/supabase-js@2.115.0'
import { downloadMetaMedia, extractDocumentText, transcribeAudio } from './adapters.ts'
import { interpret, reply, type DraftData } from './interpret.ts'
import { hashWhatsappPhone } from './pairing.ts'
import { normalizeMetaEvents, verifyMetaSignature } from './meta.ts'

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}})
const required=(name:string)=>{const value=Deno.env.get(name);if(!value)throw new Error(`Secret ausente: ${name}`);return value}

async function sendText(to:string,body:string){
  const version=required('WHATSAPP_GRAPH_VERSION'), phoneId=required('WHATSAPP_PHONE_NUMBER_ID'), token=required('WHATSAPP_ACCESS_TOKEN')
  const response=await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to,type:'text',text:{body}})})
  if(!response.ok)throw new Error('Falha ao enviar a resposta do WhatsApp.')
}

async function resolveMediaText(event:any,admin:any,userId:string,messageId:string){
  const media=await downloadMetaMedia(event.mediaId,required('WHATSAPP_ACCESS_TOKEN'),required('WHATSAPP_GRAPH_VERSION'))
  const safeName=media.filename.replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,100)
  const path=`${userId}/whatsapp/${event.externalId}/${safeName}`
  const {error}=await admin.storage.from('financial-documents').upload(path,media.bytes,{contentType:media.mimeType,upsert:true});if(error)throw error
  const digest=await crypto.subtle.digest('SHA-256',media.bytes);const mediaHash=Array.from(new Uint8Array(digest)).map((byte)=>byte.toString(16).padStart(2,'0')).join('')
  const {error:updateError}=await admin.from('whatsapp_messages').update({storage_path:path,media_hash:mediaHash,media_mime_type:media.mimeType,media_size:media.bytes.byteLength}).eq('id',messageId);if(updateError)throw updateError
  if(event.type==='audio')return transcribeAudio(media)
  if(event.type==='image'||event.type==='document')return extractDocumentText(media)
  return null
}

async function draftByResult(admin:any,result:any){
  const draftId=result?.draft_id||result?.draft?.id
  if(!draftId)return result?.draft||null
  const {data,error}=await admin.from('financial_drafts').select('*').eq('id',draftId).single();if(error)throw error
  return data
}

async function resultText(admin:any,result:any){
  const kind=result?.kind
  if(kind==='draft'||kind==='corrected'){const draft=await draftByResult(admin,result);return reply(draft as DraftData)}
  if(kind==='conflict'||kind==='conflict_options')return 'Já existe outro rascunho pendente.\n1 Manter os dois\n2 Ignorar o novo\n3 Substituir o anterior\n4 Corrigir o novo'
  if(kind==='kept_both'){const draft=await draftByResult(admin,result);return `Os dois rascunhos foram mantidos. Revise o mais novo:\n\n${reply(draft as DraftData)}`}
  if(kind==='replaced'){const draft=await draftByResult(admin,result);return `O rascunho anterior foi substituído. Revise o novo:\n\n${reply(draft as DraftData)}`}
  if(kind==='ignored_new')return 'O novo rascunho foi ignorado. O anterior continua aguardando sua decisão.'
  if(kind==='confirmed')return 'Movimentação confirmada e adicionada ao UaiConta.'
  if(kind==='ignored')return 'Rascunho ignorado. Nenhuma movimentação foi criada.'
  if(kind==='paired')return 'WhatsApp vinculado ao UaiConta. Envie uma mensagem, imagem, PDF ou áudio para criar um rascunho.'
  if(kind==='request_correction')return 'Envie somente a correção. Exemplos: “valor 42,90”, “data 08/10/2026” ou “categoria Supermercado”.'
  if(kind==='stale')return 'Este rascunho já foi alterado por outra resposta. Nenhuma nova movimentação foi criada.'
  return 'Não há rascunho aguardando essa opção. Envie uma despesa ou receita primeiro.'
}

function correctionPatch(text:string){
  const next=interpret(text), patch:any={}
  if(next.amount_cents&&/valor|r\$|\d+[,.]\d{2}/i.test(text))patch.amount_cents=next.amount_cents
  if(/data|\d{1,2}[\/.\-]\d{1,2}/i.test(text))patch.transaction_date=next.transaction_date
  if(/categoria|mercado|farmacia|uber/i.test(text))patch.category=next.category
  if(/descri[cç][aã]o/i.test(text))patch.description=text.replace(/^.*?[:\-]\s*/,'').slice(0,160)
  return patch
}

Deno.serve(async(req)=>{
  try{
    const url=new URL(req.url)
    if(req.method==='GET'){
      const valid=url.searchParams.get('hub.mode')==='subscribe'&&url.searchParams.get('hub.verify_token')===required('WHATSAPP_VERIFY_TOKEN')
      return valid?new Response(url.searchParams.get('hub.challenge')||'',{status:200}):new Response('Forbidden',{status:403})
    }
    if(req.method!=='POST')return new Response('Method not allowed',{status:405})
    const raw=await req.text();if(!await verifyMetaSignature(raw,req.headers.get('x-hub-signature-256'),required('WHATSAPP_APP_SECRET')))return new Response('Unauthorized',{status:401})
    const admin=createClient(required('SUPABASE_URL'),required('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}})
    let retryRequired=false
    for(const event of normalizeMetaEvents(JSON.parse(raw))){
      let claimedMessageId:string|null=null
      try{
      const phoneHash=await hashWhatsappPhone(event.sender,required('WHATSAPP_PHONE_HASH_PEPPER'))
      const {data:link}=await admin.from('whatsapp_links').select('user_id').eq('phone_hash',phoneHash).eq('active',true).maybeSingle()
      const {data:claim,error:claimError}=await admin.rpc('claim_whatsapp_message',{p_user_id:link?.user_id||null,p_external_id:event.externalId,p_message_type:event.type,p_metadata:{received_at:event.timestamp,mime_type:event.mimeType,media_id:event.mediaId}})
      if(claimError)throw claimError
      if(claim?.state==='processed')continue
      if(claim?.state==='busy'){retryRequired=true;continue}
      const messageId=claim?.id
      if(!messageId)throw new Error('O inbox não devolveu um claim válido.')
      claimedMessageId=messageId
      const {data:messageState,error:stateError}=await admin.from('whatsapp_messages').select('result_payload').eq('id',messageId).single();if(stateError)throw stateError
      if(messageState.result_payload){await sendText(event.sender,await resultText(admin,messageState.result_payload));await admin.from('whatsapp_messages').update({processing_status:'processed',processed_at:new Date().toISOString()}).eq('id',messageId);continue}
      let userId=link?.user_id||null
      if(!userId&&event.text&&/^\d{8}$/.test(event.text.trim())){
        const {data:pairedUser,error:pairError}=await admin.rpc('consume_whatsapp_pairing_code',{p_message_id:messageId,p_code:event.text.trim(),p_phone_hash:phoneHash,p_last4:event.sender.slice(-4)});if(pairError)throw pairError
        if(pairedUser){userId=pairedUser;await sendText(event.sender,await resultText(admin,{kind:'paired'}));await admin.from('whatsapp_messages').update({processing_status:'processed',processed_at:new Date().toISOString()}).eq('id',messageId);continue}
      }
      if(!userId){await sendText(event.sender,'Este número ainda não está vinculado. Gere um código em Mais > WhatsApp no UaiConta.');await admin.from('whatsapp_messages').update({processing_status:'processed',processed_at:new Date().toISOString()}).eq('id',messageId);continue}
      const extracted=event.text||(event.mediaId?await resolveMediaText(event,admin,userId,messageId):null)
      if(!extracted){await sendText(event.sender,'Recebi o arquivo, mas a leitura não está configurada nesta instalação. Você pode enviar os dados em texto.');await admin.from('whatsapp_messages').update({processing_status:'processed',processed_at:new Date().toISOString()}).eq('id',messageId);continue}
      const draft=interpret(extracted)
      const {data:created,error}=await admin.rpc('dispatch_whatsapp_text',{p_message_id:messageId,p_user_id:userId,p_text:extracted.trim(),p_draft:draft,p_patch:correctionPatch(extracted)});if(error)throw error
      await sendText(event.sender,await resultText(admin,created));await admin.from('whatsapp_messages').update({processing_status:'processed',processed_at:new Date().toISOString()}).eq('id',messageId)
      }catch(eventError){retryRequired=true;if(claimedMessageId)await admin.from('whatsapp_messages').update({processing_status:'failed',processed_at:new Date().toISOString()}).eq('id',claimedMessageId);console.error('whatsapp_event_error',{name:eventError instanceof Error?eventError.name:'Error'})}
    }
    return retryRequired?json({error:'Um ou mais eventos serão tentados novamente.'},500):json({received:true})
  }catch(error){console.error('whatsapp_webhook_error',{name:error instanceof Error?error.name:'Error'});return json({error:'Falha ao processar o evento.'},500)}
})
