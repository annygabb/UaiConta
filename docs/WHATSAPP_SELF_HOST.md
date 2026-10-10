# WhatsApp financeiro — configuração self-host

O WhatsApp do UaiConta é opcional. Cada instalação usa seu próprio projeto Supabase e seu próprio aplicativo na Meta. Não existe servidor, conta ou banco compartilhado com o mantenedor do repositório.

## O que funciona

- vinculação por código único de oito dígitos, válido por 10 minutos;
- telefone armazenado somente como hash com pepper e quatro últimos dígitos;
- texto financeiro transformado em rascunho;
- resposta `1` confirma, `2` ignora e `3` abre a correção;
- quando chega outro lançamento com um rascunho pendente, oferece manter os dois, ignorar o novo, substituir o anterior ou corrigir o novo;
- confirmação atômica: o mesmo rascunho não cria duas movimentações;
- webhook idempotente pelo identificador da mensagem da Meta;
- imagem, PDF e áudio salvos no bucket privado do usuário;
- adaptadores self-host opcionais para OCR de mídia e transcrição.

O sistema **nunca confirma automaticamente**. Imagem, PDF e áudio sem adaptador configurado são preservados, mas o bot pede que os dados sejam enviados em texto.

## 1. Banco e função

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
supabase functions deploy whatsapp-webhook --no-verify-jwt
supabase functions deploy cleanup-receipt-imports --no-verify-jwt
```

## 2. Secrets exclusivos do servidor

Defina no Supabase Dashboard ou com `supabase secrets set`:

```env
WHATSAPP_VERIFY_TOKEN=gere-um-token-longo
WHATSAPP_APP_SECRET=segredo-do-app-meta
WHATSAPP_ACCESS_TOKEN=token-da-cloud-api
WHATSAPP_PHONE_NUMBER_ID=id-do-numero-meta
WHATSAPP_GRAPH_VERSION=vXX.X
WHATSAPP_PHONE_HASH_PEPPER=segredo-aleatorio-com-32-ou-mais-bytes
CRON_SECRET=segredo-aleatorio-para-a-rotina-de-limpeza
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são disponibilizados pelo runtime do Supabase. Nunca copie esses valores para variáveis `VITE_*`.

O código temporário é gerado e consumido atomicamente pelo PostgreSQL, com hash adaptativo e limite de tentativas por remetente. O navegador nunca grava diretamente a tabela de códigos.

## 3. Webhook na Meta

No painel do WhatsApp Cloud API, configure:

```txt
https://SEU_PROJECT_REF.supabase.co/functions/v1/whatsapp-webhook
```

Use o mesmo `WHATSAPP_VERIFY_TOKEN` e assine o campo de mensagens. A função valida `X-Hub-Signature-256` com `WHATSAPP_APP_SECRET` antes de interpretar o corpo.

## 4. OCR e áudio opcionais

Para manter o projeto neutro, gratuito e open source, os adaptadores são endpoints HTTP configuráveis:

```env
DOCUMENT_TEXT_ENDPOINT=https://seu-ocr-self-host/extract
AUDIO_TRANSCRIPTION_ENDPOINT=https://seu-whisper-self-host/transcribe
MEDIA_ADAPTER_TOKEN=token-opcional-do-seu-adaptador
```

Cada endpoint recebe os bytes no corpo, `Content-Type` original e `X-File-Name`, e retorna:

```json
{ "text": "texto reconhecido" }
```

Você pode hospedar Tesseract/OCRmyPDF para documentos e Whisper.cpp/faster-whisper para áudio. O UaiConta não exige API paga. “Gratuito e ilimitado” significa que o código não cobra nem impõe cota; os limites reais dependem da sua infraestrutura, da Meta e do plano do Supabase.

## 5. Teste seguro

1. Entre no UaiConta e abra **Mais → WhatsApp**.
2. Gere o código e envie-o ao número da sua Cloud API.
3. Envie `Paguei 35,90 no mercado por Pix em 08/10/2026`.
4. Confira o rascunho e responda `1`.
5. Confirme que surgiu uma única despesa no dashboard.
6. Reenvie o mesmo webhook: nenhuma segunda movimentação deve ser criada.

Não use comprovantes reais em ambientes de teste compartilhados.

Agende uma chamada `POST` diária para `cleanup-receipt-imports` com o header `X-Cron-Secret`. A rotina remove somente lotes de nota que ficaram em `prepared` por mais de 24 horas; lotes finalizados nunca entram nessa limpeza.
