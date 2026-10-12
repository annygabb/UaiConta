# WhatsApp financeiro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Receber texto, áudio, imagem e documentos do WhatsApp e converter cada interpretação em rascunho confirmável, corrigível ou cancelável.

**Architecture:** Uma Edge Function valida a Meta, normaliza eventos e usa adaptadores para mídia/transcrição. O estado conversacional e a idempotência ficam no Postgres; o domínio financeiro só recebe dados após confirmação.

**Tech Stack:** Supabase Edge Functions/Deno, Postgres/RLS, Meta WhatsApp Cloud API, TypeScript, React e Vitest.

**Spec:** `docs/superpowers/specs/2026-10-08-importacao-inteligente-whatsapp-design.md`

## Global Constraints

- WhatsApp é opcional e configurado por instalação.
- Número precisa estar vinculado a um usuário.
- Toda interpretação começa como rascunho.
- `1` confirma, `2` cancela e `3` inicia correção.
- Reenvios do webhook são idempotentes.
- Segredos ficam somente no servidor.
- Logs não incluem conteúdo financeiro nem telefone completo.

## Review Focus

- Meta reenviar o mesmo evento não pode criar dois rascunhos.
- Resposta `1` fora de uma conversa pendente deve explicar que não há item para confirmar.
- Duas mensagens financeiras seguidas precisam manter contexto explícito sem confirmar a errada.
- Áudio ilegível e mídia expirada devem permanecer como erro recuperável.
- Número desvinculado não pode consultar nem criar dados.

---

### Task 1: Tabelas, estados e políticas

**Files:**
- Create: `supabase/migrations/<generated>_whatsapp_finance.sql`
- Create: `supabase/tests/whatsapp_rls.test.sql`
- Create: `src/features/whatsapp/whatsapp.types.ts`

**Interfaces:**
- Produces: tabelas `whatsapp_links`, `whatsapp_pairing_codes`, `whatsapp_messages`, `financial_drafts`, `draft_corrections`; enum/constraints de estado.

- [ ] **Step 1: Run `supabase migration new whatsapp_finance`**.
- [ ] **Step 2: Write failing pgTAP tests** para isolamento, expiração, uso único e grants.
- [ ] **Step 3: Run `supabase test db`** e confirmar falha.
- [ ] **Step 4: Create tables, indexes, RLS and per-operation policies** com ownership por `user_id` e telefone cifrado/normalizado quando necessário.
- [ ] **Step 5: Run database tests and advisors**.
- [ ] **Step 6: Commit** com `feat(whatsapp): add secure draft state schema`.

### Task 2: Vinculação por código temporário

**Files:**
- Create: `supabase/functions/whatsapp-webhook/pairing.ts`
- Create: `src/features/whatsapp/whatsapp.repository.ts`
- Create: `src/pages/settings/WhatsAppPage.tsx`
- Modify: `src/pages/MorePage.jsx`
- Test: `tests/unit/whatsapp-pairing.test.ts`
- Test: `tests/e2e/whatsapp-settings.spec.ts`

**Interfaces:**
- Produces: `createPairingCode()`, `consumePairingCode(phone, code)` e tela de status/conexão.

- [ ] **Step 1: Write failing tests** para hash, expiração, uso único, número diferente e desconexão.
- [ ] **Step 2: Run focused tests**.
- [ ] **Step 3: Implement pairing** sem armazenar código puro e sem expor token da Meta no frontend.
- [ ] **Step 4: Add responsive settings UI**.
- [ ] **Step 5: Run unit/E2E/accessibility tests**.
- [ ] **Step 6: Commit** com `feat(whatsapp): pair sender with account`.

### Task 3: Webhook seguro e idempotente

**Files:**
- Create: `supabase/functions/whatsapp-webhook/index.ts`
- Create: `supabase/functions/whatsapp-webhook/meta.ts`
- Create: `supabase/functions/whatsapp-webhook/idempotency.ts`
- Create: `supabase/functions/whatsapp-webhook/README.md`
- Test: `tests/unit/whatsapp-webhook.test.ts`

**Interfaces:**
- Produces: GET de verificação, POST com validação de assinatura, `normalizeMetaEvent(payload)` e `claimEvent(eventId)`.

- [ ] **Step 1: Write failing webhook contract tests** para desafio, assinatura inválida, evento duplicado e remetente não vinculado.
- [ ] **Step 2: Run focused tests**.
- [ ] **Step 3: Implement validation and normalized dispatch**; responder rapidamente e registrar processamento idempotente.
- [ ] **Step 4: Run tests and lint**.
- [ ] **Step 5: Commit** com `feat(whatsapp): validate and deduplicate meta webhooks`.

### Task 4: Interpretação e adaptadores de mídia

**Files:**
- Create: `supabase/functions/whatsapp-webhook/interpret.ts`
- Create: `supabase/functions/whatsapp-webhook/adapters/transcription.ts`
- Create: `supabase/functions/whatsapp-webhook/adapters/ocr.ts`
- Create: `supabase/functions/whatsapp-webhook/adapters/document.ts`
- Test: `tests/unit/whatsapp-interpretation.test.ts`

**Interfaces:**
- Produces: `interpretMessage(input): FinancialDraft`, interfaces `TranscriptionAdapter`, `OcrAdapter`, `DocumentAdapter`.

- [ ] **Step 1: Write failing tests** para texto, áudio transcrito, imagem, PDF, receita, despesa, Pix pago/recebido e campos ausentes.
- [ ] **Step 2: Run focused tests**.
- [ ] **Step 3: Implement rule-first interpretation** usando os contratos compartilhados da importação; adaptadores externos ficam opcionais.
- [ ] **Step 4: Store originals privately** e persistir evidência/baixa confiança.
- [ ] **Step 5: Run tests and typecheck**.
- [ ] **Step 6: Commit** com `feat(whatsapp): interpret financial messages and media`.

### Task 5: Confirmação e correção conversacional

**Files:**
- Create: `supabase/functions/whatsapp-webhook/conversation.ts`
- Create: `supabase/functions/whatsapp-webhook/replies.ts`
- Test: `tests/unit/whatsapp-conversation.test.ts`

**Interfaces:**
- Produces: `handleConversationCommand(context, message)` e transições `received → processing → awaiting_confirmation → confirmed|cancelled|awaiting_correction`.

- [ ] **Step 1: Write failing state-machine tests** para `1`, `2`, `3`, correção natural, nova confirmação e comandos sem contexto.
- [ ] **Step 2: Run focused tests**.
- [ ] **Step 3: Implement state transitions transactionally** e criar movimentação somente na confirmação.
- [ ] **Step 4: Ensure a correction changes only named fields** e preserva histórico.
- [ ] **Step 5: Run focused and security tests**.
- [ ] **Step 6: Commit** com `feat(whatsapp): confirm correct or cancel drafts`.

### Task 6: Deploy, diagnóstico e E2E simulado

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Create: `docs/WHATSAPP_SELF_HOST.md`
- Create: `tests/e2e/whatsapp-flow.spec.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: documentação de Meta/segredos/webhook e um fluxo simulado sem usar número real no CI.

- [ ] **Step 1: Add a failing simulated E2E flow** do evento Meta até movimentação confirmada.
- [ ] **Step 2: Add documented variables** `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` somente em runtime server-side.
- [ ] **Step 3: Add setup and troubleshooting instructions** para WhatsApp Business e Cloud API.
- [ ] **Step 4: Run lint, typecheck, unit, security and simulated E2E suites**.
- [ ] **Step 5: Commit** com `docs(whatsapp): add self-host deployment guide`.
