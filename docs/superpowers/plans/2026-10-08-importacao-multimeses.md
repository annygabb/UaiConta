# Importação multimeses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar corretamente movimentações de diferentes meses, registrar a origem de cada campo e permitir decisões explícitas sobre duplicidades.

**Architecture:** O pipeline local será dividido em extração, resolução de data, normalização e revisão. PDFs, CSVs e imagens produzirão o mesmo contrato de rascunho; somente a confirmação chama o repositório de movimentações.

**Tech Stack:** React 18, JavaScript/TypeScript, Vite, pdf.js, Tesseract.js, Vitest e Playwright.

**Spec:** `docs/superpowers/specs/2026-10-08-importacao-inteligente-whatsapp-design.md`

## Global Constraints

- Processamento de PDF e CSV deve continuar local.
- Valores financeiros persistidos usam centavos inteiros.
- Rascunhos não alteram totais.
- Datas ambíguas nunca recebem mês silenciosamente.
- Safari/iPhone continua usando o caminho compatível existente.
- Não adicionar provedor de IA obrigatório.

## Review Focus

- Cabeçalho `Agosto` seguido por vários dias e depois `Setembro` deve trocar o mês somente no ponto correto.
- Extrato que atravessa dezembro/janeiro deve resolver o ano sem mover linhas para o ano errado.
- Linha sem data e sem contexto deve ficar pendente, não usar hoje silenciosamente.
- Reimportação do mesmo arquivo deve sinalizar hash/itens, não descartar automaticamente.
- Descrição com vários valores monetários deve distinguir valor da transação de saldo e totais informativos.

---

### Task 1: Contrato canônico de rascunho

**Files:**
- Create: `src/features/import/import.types.ts`
- Create: `src/features/import/provenance.ts`
- Modify: `src/types/finance.ts`
- Test: `tests/unit/import-provenance.test.ts`

**Interfaces:**
- Produces: `ImportDraft`, `FieldEvidence`, `DateResolution`, `ImportSource`, `ImportConfidence` e `summarizeDraftConfidence(draft)`.

- [ ] **Step 1: Write the failing contract tests** para validar que cada campo possui `value`, `source`, `confidence` e `evidence`, e que um campo ambíguo torna o rascunho revisável.
- [ ] **Step 2: Run `npm run test:unit -- tests/unit/import-provenance.test.ts`** e confirmar falha por módulos ausentes.
- [ ] **Step 3: Implement the canonical types and `summarizeDraftConfidence(draft: ImportDraft): ImportConfidence`** sem alterar o contrato público de `Transaction`.
- [ ] **Step 4: Run the focused test and `npm run typecheck`** e confirmar sucesso.
- [ ] **Step 5: Commit** com `feat(import): add canonical draft provenance contract`.

### Task 2: Resolvedor determinístico de datas

**Files:**
- Create: `src/features/import/dateResolution.ts`
- Test: `tests/unit/import-date-resolution.test.ts`

**Interfaces:**
- Consumes: `DateResolution` e `FieldEvidence` da Task 1.
- Produces: `resolveTransactionDate(input: DateResolutionInput): DateResolution` e `scanMonthAnchors(text: string, referenceYear: number): MonthAnchor[]`.

- [ ] **Step 1: Write failing tests** para data completa, dia + cabeçalho `Agosto`, mudança para `Setembro`, documento geral, horário de mensagem, ambiguidade e virada dezembro/janeiro.
- [ ] **Step 2: Run `npm run test:unit -- tests/unit/import-date-resolution.test.ts`** e confirmar falha.
- [ ] **Step 3: Implement the priority order** `line → month heading → document → receivedAt → pending`, retornando regra e evidência.
- [ ] **Step 4: Run the focused test** e confirmar todos os cenários.
- [ ] **Step 5: Commit** com `feat(import): resolve dates from month headings`.

### Task 3: Parser de PDF multimeses

**Files:**
- Modify: `src/pdfParserFree.js`
- Test: `tests/unit/pdf-parser.test.js`
- Create: `tests/fixtures/statements/multi-month.txt`
- Create: `tests/fixtures/statements/year-boundary.txt`

**Interfaces:**
- Consumes: `resolveTransactionDate` e `scanMonthAnchors` da Task 2.
- Produces: `parseFinancialText(text, options)` com `dateResolution`, `fieldEvidence` e `requiresReview` em cada linha.

- [ ] **Step 1: Add failing fixture tests** que reproduzem agosto/setembro e dezembro/janeiro, incluindo saldos informativos que não viram movimentação.
- [ ] **Step 2: Run `npm run test:unit -- tests/unit/pdf-parser.test.js`** e confirmar que o parser atual agrupa ou omite incorretamente.
- [ ] **Step 3: Refactor anchor scanning** para manter contexto de mês por posição e usar o resolvedor sem remover a compatibilidade do Safari.
- [ ] **Step 4: Run PDF parser tests** e confirmar datas e quantidades exatas.
- [ ] **Step 5: Commit** com `fix(import): separate statement rows by month context`.

### Task 4: CSV e imagem no mesmo contrato

**Files:**
- Modify: `src/features/import/importParser.js`
- Create: `src/features/import/receiptTextParser.ts`
- Test: `tests/unit/import-parser.test.js`
- Test: `tests/unit/receipt-text-parser.test.ts`

**Interfaces:**
- Consumes: contrato da Task 1 e resolvedor da Task 2.
- Produces: `parseReceiptText(text: string, context): ImportDraft` e `extractTransactionsFromFile` retornando rascunhos normalizados.

- [ ] **Step 1: Add failing tests** para CSV sem data, CSV com data, imagem com data explícita e imagem sem data.
- [ ] **Step 2: Run both focused test files** e confirmar falhas de proveniência/ambiguidade.
- [ ] **Step 3: Adapt CSV and image extraction** sem usar `new Date()` como fallback silencioso; data do upload deve ser evidência explícita.
- [ ] **Step 4: Run focused tests and typecheck**.
- [ ] **Step 5: Commit** com `feat(import): normalize csv and image draft evidence`.

### Task 5: Decisões de duplicidade

**Files:**
- Create: `src/features/import/duplicateDetection.ts`
- Modify: `src/pdfParserFree.js`
- Modify: `src/components/PdfImportModal.jsx`
- Test: `tests/unit/import-duplicates.test.ts`
- Test: `tests/e2e/uaiconta.spec.js`

**Interfaces:**
- Produces: `findDuplicateCandidates(draft, existing, batch)`, `applyDuplicateDecision(decision)` com decisões `keep_both | ignore_new | replace_existing | edit_new`.

- [ ] **Step 1: Write failing unit and E2E tests** para as quatro decisões e para reimportação do mesmo arquivo.
- [ ] **Step 2: Run focused tests** e confirmar falha.
- [ ] **Step 3: Implement weighted matching** por hash externo, data, centavos, estabelecimento, descrição e pagamento; não incluir `sourceFile` como requisito para detectar duplicidade entre fontes.
- [ ] **Step 4: Replace the disabled checkbox behavior** por um card de decisão explícita no modal.
- [ ] **Step 5: Run unit, E2E and responsive tests**.
- [ ] **Step 6: Commit** com `feat(import): add explicit duplicate resolution`.

### Task 6: Confirmação e regressão do fluxo

**Files:**
- Modify: `src/components/PdfImportModal.jsx`
- Modify: `src/features/transactions/transaction.repository.ts`
- Modify: `tests/e2e/pdf-import-webkit.spec.js`
- Create: `tests/e2e/import-review.spec.ts`

**Interfaces:**
- Consumes: rascunhos canônicos e decisões das Tasks 1–5.
- Produces: persistência somente de rascunhos confirmados e sem campos obrigatórios pendentes.

- [ ] **Step 1: Add failing E2E tests** para baixa confiança, data pendente, correção parcial e confirmação.
- [ ] **Step 2: Run WebKit and import review tests**.
- [ ] **Step 3: Gate `onImport`** para impedir persistência de rascunhos inválidos e remover metadados apenas depois de convertê-los em campos persistíveis.
- [ ] **Step 4: Run `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:e2e -- tests/e2e/pdf-import-webkit.spec.js tests/e2e/import-review.spec.ts` and `npm run build:demo`**.
- [ ] **Step 5: Commit** com `test(import): verify reviewed drafts before persistence`.
