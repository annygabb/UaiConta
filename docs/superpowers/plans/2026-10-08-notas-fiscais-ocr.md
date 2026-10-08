# Notas fiscais OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extrair dados estruturados de notas em imagem/PDF, reconciliar itens e criar uma única despesa confirmada com produtos vinculados.

**Architecture:** OCR e leitura de PDF produzem texto normalizado; um parser determinístico identifica cabeçalho, itens, totais e pagamento. A confirmação persiste nota, itens e movimentação de forma atômica no Supabase.

**Tech Stack:** Tesseract.js, pdf.js, React, TypeScript, Supabase/Postgres, Vitest e Playwright.

**Spec:** `docs/superpowers/specs/2026-10-08-importacao-inteligente-whatsapp-design.md`

## Global Constraints

- Uma nota confirmada gera uma única despesa pelo total.
- Produtos permanecem itens vinculados, não movimentações independentes.
- Valores usam centavos inteiros.
- Original fica no bucket privado.
- Divergência entre soma e total exige revisão.
- OCR open source é o padrão; provedor externo é opcional.

## Review Focus

- Nota com desconto global deve reconciliar subtotal, desconto e total.
- Produto descrito em duas linhas não pode virar dois itens.
- Quantidade decimal e preço por quilo devem conservar centavos.
- OCR com vírgula/ponto trocados deve exigir revisão quando a soma não fechar.
- Documento sem total confiável não pode criar despesa definitiva.

---

### Task 1: Parser estruturado de notas

**Files:**
- Create: `src/features/receipts/receiptParser.ts`
- Create: `src/features/receipts/receipt.types.ts`
- Test: `tests/unit/receipt-parser.test.ts`
- Create: `tests/fixtures/receipts/supermarket-basic.txt`
- Create: `tests/fixtures/receipts/supermarket-discount.txt`

**Interfaces:**
- Produces: `parseReceiptText(text, context): ReceiptExtraction`, `ReceiptLineItem`, `ReceiptTotals`, `ReceiptFieldEvidence`.

- [ ] **Step 1: Write failing fixture tests** para estabelecimento, CNPJ, data, itens, quantidade, valores, total e pagamento.
- [ ] **Step 2: Run `npm run test:unit -- tests/unit/receipt-parser.test.ts`** e confirmar falha.
- [ ] **Step 3: Implement deterministic sections and money parsing** com evidência por campo.
- [ ] **Step 4: Run focused tests and typecheck**.
- [ ] **Step 5: Commit** com `feat(receipts): parse structured receipt data`.

### Task 2: Reconciliação e confiança

**Files:**
- Create: `src/features/receipts/reconcileReceipt.ts`
- Test: `tests/unit/receipt-reconciliation.test.ts`

**Interfaces:**
- Consumes: `ReceiptExtraction` da Task 1.
- Produces: `reconcileReceipt(extraction): ReceiptReconciliation` com `differenceCents`, `status` e campos pendentes.

- [ ] **Step 1: Write failing tests** para soma exata, desconto, acréscimo, arredondamento e divergência.
- [ ] **Step 2: Run focused test** e confirmar falha.
- [ ] **Step 3: Implement cent-based reconciliation** sem ponto flutuante financeiro.
- [ ] **Step 4: Run focused tests**.
- [ ] **Step 5: Commit** com `feat(receipts): reconcile items with receipt total`.

### Task 3: Persistência atômica e RLS

**Files:**
- Create: `supabase/migrations/<generated>_receipt_confirmation.sql`
- Create: `supabase/tests/receipt_confirmation_rls.test.sql`
- Modify: `src/features/receipts/receipt.repository.ts`
- Modify: `src/features/transactions/transaction.repository.ts`
- Test: `tests/security/security-baseline.test.ts`

**Interfaces:**
- Produces: RPC `confirm_receipt_import(payload jsonb)` em modo invoker e `receiptRepository.confirm(extraction)`.

- [ ] **Step 1: Run `supabase migration new receipt_confirmation`** para gerar o nome da migration.
- [ ] **Step 2: Write failing pgTAP tests** para proprietário, outro usuário, usuário anônimo e tentativa de trocar `user_id`.
- [ ] **Step 3: Run `supabase test db`** e confirmar falha antes da migration.
- [ ] **Step 4: Add atomic inserts** de `transactions`, `receipts` e `receipt_items`, grants mínimos e políticas separadas por operação; não usar `SECURITY DEFINER` para contornar RLS.
- [ ] **Step 5: Update repository interfaces** para enviar centavos, evidência e itens e receber IDs criados.
- [ ] **Step 6: Run `supabase test db`, security tests and typecheck**.
- [ ] **Step 7: Commit** com `feat(receipts): confirm receipt and expense atomically`.

### Task 4: Revisão visual da nota

**Files:**
- Create: `src/components/receipts/ReceiptReviewDialog.tsx`
- Create: `src/components/receipts/ReceiptItemsEditor.tsx`
- Modify: `src/pages/settings/ReceiptsPage.jsx`
- Modify: `src/components/PdfImportModal.jsx`
- Test: `tests/e2e/receipt-import.spec.ts`

**Interfaces:**
- Consumes: parser, reconciliação e `receiptRepository.confirm`.
- Produces: edição de estabelecimento, data, total, pagamento e itens antes da confirmação.

- [ ] **Step 1: Write failing E2E tests** para imagem, PDF, correção de item, divergência e confirmação.
- [ ] **Step 2: Run the focused E2E test**.
- [ ] **Step 3: Implement responsive review UI** com Tabler Icons, sem emojis e sem scroll horizontal.
- [ ] **Step 4: Prevent confirmation** enquanto total ou data obrigatórios estiverem pendentes.
- [ ] **Step 5: Run E2E, responsive and accessibility tests**.
- [ ] **Step 6: Commit** com `feat(receipts): add structured receipt review`.

### Task 5: Regressão e documentos reais

**Files:**
- Modify: `tests/unit/receipt-parser.test.ts`
- Modify: `tests/e2e/receipt-import.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: matriz documentada de formatos e limitações.

- [ ] **Step 1: Add sanitized cases** equivalentes às notas reais fornecidas, sem dados pessoais no repositório.
- [ ] **Step 2: Run `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:security`, `npm run test:e2e -- tests/e2e/receipt-import.spec.ts` and `npm run build:demo`**.
- [ ] **Step 3: Document supported formats and review behavior**.
- [ ] **Step 4: Commit** com `docs(receipts): document verified import behavior`.
