# UaiConta

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
- importação de PDF, imagem e CSV com revisão antes de persistir;
- processamento de PDF localmente com `pdf.js`, sem Anthropic/Claude;
- OCR open source para imagens e documentos digitalizados;
- categorização como sugestão, com confiança e aviso de duplicidade;
- notas, cupons e comprovantes em PDF/imagem/câmera;
- documentos privados no Supabase Storage;
- exportação de dados em JSON, PDF e Excel;
- interface responsiva, PWA e navegação mobile;
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
- seletor central de período com roleta de mês/ano;
- visual financeiro com moeda 3D e os mesmos dados da fonte central de métricas;
- fluxo/waterfall `Receita → Gastos → Investimentos → Sobra`;
- donut de gastos por categoria;
- estado especial para gastos não categorizados;
- visão Pix x cartões, separando crédito/débito quando identificado;
- tendências e insights derivados dos dados reais;
- textos e cards protegidos contra overflow em telas menores.

### Movimentações

Tipos:

- receita;
- despesa;
- investimento;
- transferência.

Suporta categoria, forma de pagamento, status, recorrência, observação e origem do dado. Os filtros usam componentes estáveis para não deslocar a página nem ampliar o viewport ao abrir menus.

### Contas, cartões e categorias

Há CRUD para contas, cartões e categorias. Cartões podem ter nome, banco, limite, fechamento e vencimento, e o dashboard associa movimentações aos cartões identificados.

### Recorrências

Estratégia híbrida: a regra é persistida e as ocorrências futuras são projetadas virtualmente. Uma ocorrência pode ser confirmada ou pulada sem transformar automaticamente todo o futuro em realizado. Fontes de renda ativas e recorrentes, como salário, geram a regra correspondente para aparecer na área de Recorrências.

### Parcelas

O domínio possui divisão exata em centavos e a migration cria a fundação de planos/parcelas. Melhorias adicionais do fluxo completo de parcelamento permanecem documentadas em `PENDENCIAS.md` enquanto não forem validadas ponta a ponta.

### Importação de arquivos

- PDF, imagens e CSV;
- fila e revisão antes da importação;
- processamento local de PDF com `pdf.js`;
- OCR open source quando necessário;
- filtro de texto informativo/rodapé;
- `rawDescription` separado da descrição de exibição;
- categorização apenas como sugestão;
- confiança alta/média/baixa;
- detecção de possível duplicidade;
- rascunho local persistente para não perder os arquivos selecionados ao sair da tela.

### Notas e comprovantes

Formatos suportados incluem PDF, JPG, PNG e WEBP. No mobile também é possível usar a câmera. O original é preservado mesmo se o OCR falhar.

Os arquivos ficam no bucket privado `financial-documents` quando o Supabase está configurado, com acesso autenticado e URLs assinadas de curta duração.

### Dados e backup

A área **Dados e backup** permite escolher o formato conforme o objetivo:

- **JSON**: backup técnico estruturado;
- **PDF**: relatório legível gerado localmente;
- **Excel**: planilha para filtros e análise.

## Login, privacidade e sessão

- login e cadastro separados por abas estáveis;
- validação visual dos campos e indicador de senha forte;
- Termos de Uso e Política de Privacidade acessíveis antes do cadastro;
- tratamento amigável para sessão com relógio/JWT fora de sincronia;
- dados locais antigos são migrados automaticamente para a conta quando possível, preservando o backup no navegador.

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
- GSAP + Motion para interações pontuais;
- Recharts;
- Supabase Auth + PostgreSQL + Storage;
- Supabase Edge Functions em TypeScript;
- pdf.js;
- Tesseract.js;
- jsPDF para relatório local;
- Vitest;
- Playwright + axe.

## Testar em modo Demo

```bash
git clone https://github.com/annygabb/UaiConta.git
cd UaiConta
npm install
npm run dev -- --mode demo
```

O modo Demo é explícito e usa persistência local apenas para desenvolvimento/demonstração.

## Rodar com Supabase

1. Crie um projeto Supabase.
2. Execute `supabase/schema.sql` para a base inicial.
3. Aplique as migrations incrementais de `supabase/migrations/` na ordem.
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
npm run test:responsive
npm run test:a11y
npm run audit
```

O Playwright valida desktop e mobile, rotas críticas, overflow horizontal em uma matriz de viewports, abertura estável de filtros, sidebar recolhida, seletor de período e acessibilidade com axe. O resultado efetivo de cada revisão deve ser conferido no GitHub Actions antes de promover a versão para produção.

## PWA e responsividade

O projeto possui manifest, service worker, ícones e suporte standalone. A interface considera safe areas, bottom navigation mobile, tabelas convertidas em cards, roletas de data/período adaptadas como bottom sheet em telas pequenas e `prefers-reduced-motion`.

A matriz completa de validação e pendências fica em [`PENDENCIAS.md`](./PENDENCIAS.md).

## Open source e contribuição

Licença MIT. Veja [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Estado do projeto

A revisão atual prioriza o ciclo **MVP funcional → integridade dos dados → UI/UX → responsividade → testes → performance**. Itens ainda parciais ficam explicitamente documentados em vez de serem apresentados como concluídos sem validação.
