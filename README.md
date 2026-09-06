# UaiConta — Personal Finance OS

> Controle financeiro pessoal open source para entender **quanto entrou, quanto saiu, onde o dinheiro foi, o que ainda está previsto e quanto tende a sobrar** — no computador, tablet e celular.

## Por que o UaiConta existe

Finanças pessoais costumam ficar espalhadas entre faturas, Pix, extratos, recibos, notas fiscais, planilhas e contas feitas à mão. O UaiConta reúne essas informações em uma única experiência e transforma movimentações em contexto para tomada de decisão.

A proposta não é ser só um dashboard: o projeto separa **realizado x previsto**, trata receitas, despesas, investimentos e transferências como domínios diferentes, permite recorrências e mantém documentos financeiros associados aos dados.

## O que você ganha

- visão rápida de receitas, gastos, investimentos e sobra;
- projeção do período sem confundir previsão com valor realizado;
- gráfico de categorias com porcentagens reais;
- comparação Pix x cartão por período;
- múltiplas fontes de renda;
- recorrências que aparecem nos meses futuros como `planned`;
- fundação tipada para parcelamento com divisão exata de centavos;
- importação de vários PDFs localmente com `pdf.js`, sem Anthropic/Claude;
- revisão dos lançamentos importados, confiança e aviso de duplicidade;
- notas, cupons e comprovantes em PDF/imagem/câmera;
- OCR open source com Tesseract.js sem impedir o salvamento do original se falhar;
- documentos privados no Supabase Storage;
- interface responsiva e PWA;
- base modular, tipada, testável e preparada para self-host.

## Domínio financeiro

O UaiConta usa valores em **centavos inteiros (`bigint` no PostgreSQL)**.

```txt
Sobra realizada = receitas realizadas - despesas realizadas - investimentos realizados

Projeção = realizado + valores previstos/recorrentes + projeção variável
```

Transferências entre contas não contam como receita nem despesa global. Uma ocorrência recorrente futura permanece `planned` até confirmação do usuário.

## Funcionalidades

### Dashboard e análises

- cards clicáveis de Receita, Gastos, Investimentos e Economia;
- seletor central de mês/ano/período;
- radial financeiro espacial com os mesmos dados da fonte central de métricas;
- fluxo/waterfall `Receita → Gastos → Investimentos → Sobra`;
- donut de gastos por categoria;
- estado especial para gastos não categorizados;
- barras Pix x cartão;
- tendências e insights derivados dos dados reais.

### Movimentações

Tipos:

- receita;
- despesa;
- investimento;
- transferência.

Suporta categoria, forma de pagamento, status, recorrência, observação e origem do dado. A ligação completa de contas/cartões/subcategorias/parcelas ao formulário está listada nas pendências da beta.

### Contas, cartões e categorias

Há CRUD inicial para contas, cartões e categorias. Subcategorias e regras avançadas de arquivamento continuam na estabilização da beta.

### Recorrências

Estratégia híbrida: a regra é persistida e as ocorrências futuras são projetadas virtualmente. Uma ocorrência pode ser confirmada ou pulada sem transformar automaticamente todo o futuro em realizado.

### Parcelas

O domínio já possui divisão exata em centavos e a migration cria a fundação de planos/parcelas. A criação e edição completa de compras parceladas pela interface ainda está em `PENDENCIAS.md` e não é apresentada como concluída.

### PDFs de extratos/faturas

- múltiplos PDFs;
- fila sequencial;
- drag and drop;
- processamento local com `pdf.js`;
- filtro de texto informativo/rodapé;
- `rawDescription` separado de descrição de exibição;
- categorização apenas como sugestão;
- confiança alta/média/baixa;
- detecção de possível duplicidade;
- revisão antes de persistir.

### Notas e comprovantes

Formatos: PDF, JPG, PNG e WEBP. No mobile também é possível usar a câmera. O original é preservado mesmo se o OCR falhar.

A beta permite listar e baixar o original armazenado no bucket privado `financial-documents`. O viewer avançado com zoom/pan/fullscreen ainda está em estabilização e está documentado em `PENDENCIAS.md`.

## Segurança

A versão de produção exige Supabase; não existe fallback local silencioso. O modo local só é ativado explicitamente com `--mode demo` ou `VITE_ENABLE_DEMO_MODE=true`.

A base inclui:

- Supabase Auth via `@supabase/supabase-js`;
- RLS em todas as tabelas expostas;
- policies separadas por operação;
- `UPDATE` com `USING` + `WITH CHECK`;
- ownership por `(select auth.uid()) = user_id`;
- nenhuma `service_role` no frontend;
- bucket privado e Storage Policies por pasta do usuário;
- Edge Function `delete-account` em TypeScript para exclusão privilegiada da própria conta;
- CSP e headers de segurança;
- validação de tipos/tamanhos de upload;
- testes estáticos de baseline de RLS e vazamento de secrets.

Leia também [`SECURITY.md`](./SECURITY.md) e [`SECURITY_QA.md`](./SECURITY_QA.md).

## Arquitetura

```txt
src/
├── components/             # navegação, formulários e primitives de UI
├── domain/money/           # centavos e parcelamento exato
├── features/
│   ├── auth/
│   ├── data/
│   ├── receipts/
│   ├── recurrences/
│   ├── settings/
│   └── transactions/
├── infrastructure/supabase/
├── pages/
│   └── settings/
├── styles/
└── types/

supabase/
├── schema.sql
├── migrations/
└── functions/delete-account/

tests/
├── unit/
├── security/
└── e2e/
```

## Stack

- React 18 + TypeScript strict;
- Vite;
- React Router;
- Radix Select;
- Tabler Icons;
- Recharts;
- Supabase Auth + PostgreSQL + Storage;
- pdf.js;
- Tesseract.js;
- Vitest;
- Playwright + axe.

## Testar a branch V4 em modo Demo

```bash
git clone https://github.com/annygabb/UaiConta.git
cd UaiConta
git checkout feat/uaiconta-v4
npm install
npm run dev -- --mode demo
```

O modo Demo é explícito e usa persistência local apenas para desenvolvimento/demonstração.

## Rodar com Supabase

1. Crie um projeto Supabase.
2. Execute `supabase/schema.sql` para a base inicial.
3. Depois aplique `supabase/migrations/20260906150000_v4_foundation.sql`.
4. Faça deploy da função de exclusão com `supabase functions deploy delete-account`.
5. Copie `.env.example` para `.env.local`.
6. Configure:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
VITE_ENABLE_DEMO_MODE=false
```

7. Rode:

```bash
npm install
npm run dev
```

> Nunca coloque `service_role` no frontend. A chave privilegiada fica somente no runtime server-side da Edge Function.

## Testes e qualidade

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:security
npm run build:demo
npm run test:e2e
npm run audit
```

O Playwright possui cenários para desktop/mobile/tablet, overflow horizontal em viewports críticos e acessibilidade com axe. O resultado efetivo deve ser conferido no GitHub Actions desta branch.

## PWA e responsividade

O projeto possui manifest, service worker, ícones e suporte standalone. A interface considera safe areas, bottom navigation mobile, tabelas convertidas em cards e `prefers-reduced-motion`.

A matriz completa de validação e pendências fica em [`PENDENCIAS.md`](./PENDENCIAS.md).

## Open source e contribuição

Licença MIT. Veja [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Estado do projeto

A branch `feat/uaiconta-v4` prioriza o ciclo **MVP funcional → UI/UX → responsividade → testes → performance**. Itens que dependem de infraestrutura real ou ainda estão parciais ficam explicitamente documentados, em vez de serem apresentados como concluídos sem teste.
