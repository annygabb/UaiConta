# Self-host e segurança Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que uma pessoa instale, diagnostique e proteja sua própria instância do UaiConta seguindo somente o repositório.

**Architecture:** Um diagnóstico local verifica ambiente e recursos públicos autenticados; migrations e testes provam a configuração do banco. Segredos continuam invisíveis ao navegador e são verificados por Edge Function sem retornar seus valores.

**Tech Stack:** React, Supabase Auth/Postgres/Storage/Edge Functions, Vitest, pgTAP, Playwright e GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-08-importacao-inteligente-whatsapp-design.md`

## Global Constraints

- Cada instalação usa Supabase e hospedagem próprios.
- Nenhuma credencial real entra no Git.
- `service_role` nunca aparece no frontend.
- Tabelas expostas usam RLS e grants mínimos.
- Instalação básica funciona sem WhatsApp e sem IA paga.
- Diagnóstico nunca revela o valor de um segredo.

## Review Focus

- Ambiente com URL válida e chave de outro projeto deve ser detectado.
- Migration parcial deve apontar exatamente o recurso ausente.
- Bucket existente mas público deve falhar no diagnóstico.
- Usuário autenticado não pode usar diagnóstico para enumerar outro usuário.
- PWA antiga em cache deve orientar atualização sem apagar rascunhos locais.

---

### Task 1: Manifesto de capacidades da instalação

**Files:**
- Create: `src/features/setup/setup.types.ts`
- Create: `src/features/setup/capabilities.ts`
- Create: `tests/unit/setup-capabilities.test.ts`

**Interfaces:**
- Produces: `InstallationCapability`, `InstallationReport` e `evaluateCapabilities(probes)`.

- [ ] **Step 1: Write failing tests** para instalação básica, WhatsApp opcional, OCR disponível e configuração incompleta.
- [ ] **Step 2: Run focused tests**.
- [ ] **Step 3: Implement pure capability evaluation** sem acessar segredos.
- [ ] **Step 4: Run tests and typecheck**.
- [ ] **Step 5: Commit** com `feat(setup): define installation capability report`.

### Task 2: Probes seguros de Supabase

**Files:**
- Create: `src/features/setup/setup.repository.ts`
- Create: `supabase/functions/setup-diagnostics/index.ts`
- Test: `tests/unit/setup-diagnostics.test.ts`

**Interfaces:**
- Produces: `runClientDiagnostics()` e Edge Function que retorna somente estados booleanos/códigos de erro.

- [ ] **Step 1: Write failing tests** para Auth, tabelas, migrations, bucket, função e segredos opcionais.
- [ ] **Step 2: Run focused tests**.
- [ ] **Step 3: Implement client probes** com publishable key e server probes sem retornar segredos.
- [ ] **Step 4: Validate project identity** para detectar URL/chave incompatíveis.
- [ ] **Step 5: Run tests and lint**.
- [ ] **Step 6: Commit** com `feat(setup): diagnose supabase installation safely`.

### Task 3: Assistente de configuração

**Files:**
- Create: `src/pages/settings/SetupPage.tsx`
- Create: `src/components/setup/SetupChecklist.tsx`
- Modify: `src/pages/MorePage.jsx`
- Test: `tests/e2e/setup-assistant.spec.ts`

**Interfaces:**
- Consumes: `InstallationReport`.
- Produces: checklist responsivo com correções específicas e reteste.

- [ ] **Step 1: Write failing E2E tests** para estados pronto, parcial, erro e integrações opcionais.
- [ ] **Step 2: Run focused E2E test**.
- [ ] **Step 3: Implement the setup page** com Tabler Icons, linguagem simples e sem mostrar valores de segredo.
- [ ] **Step 4: Add copyable commands** somente para comandos públicos e nomes de variáveis.
- [ ] **Step 5: Run E2E, responsive and accessibility tests**.
- [ ] **Step 6: Commit** com `feat(setup): add self-host configuration assistant`.

### Task 4: Auditoria RLS e Storage

**Files:**
- Create: `supabase/tests/financial_drafts_rls.test.sql`
- Create: `supabase/tests/documents_storage_rls.test.sql`
- Modify: `tests/security/security-baseline.test.ts`
- Modify: `SECURITY_QA.md`

**Interfaces:**
- Produces: testes allow/deny de cada nova tabela e do bucket `financial-documents`.

- [ ] **Step 1: Generate pgTAP test files with `supabase test new`** para os recursos adicionados pelos demais planos.
- [ ] **Step 2: Assert grants and policies** para anon, proprietário e segundo usuário.
- [ ] **Step 3: Run `supabase test db` and `supabase db advisors`**.
- [ ] **Step 4: Update static baseline checks** para impedir tabela pública nova sem RLS/policies.
- [ ] **Step 5: Commit** com `test(security): verify self-host data isolation`.

### Task 5: Instalação reproduzível e CI

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Create: `docs/SELF_HOST.md`
- Modify: `.github/workflows/ci.yml`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Produces: instalação do zero, matriz de recursos opcionais e pipeline completo.

- [ ] **Step 1: Document a clean install** com Supabase, migrations, bucket, Edge Functions, Vercel e modo demo.
- [ ] **Step 2: Separate required public variables from optional server secrets**.
- [ ] **Step 3: Add CI jobs** para lint, typecheck, unit, security, build e E2E; banco local executa pgTAP quando disponível.
- [ ] **Step 4: Perform a clean-room install** seguindo apenas `docs/SELF_HOST.md` e registrar qualquer lacuna.
- [ ] **Step 5: Run the full pipeline** e confirmar sucesso.
- [ ] **Step 6: Commit** com `docs(self-host): add reproducible installation guide`.
