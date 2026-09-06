# UaiConta — Personal Finance OS

> Um painel financeiro pessoal criado para transformar movimentações em decisões: quanto entrou, quanto saiu, onde o dinheiro foi, quanto ainda pode ser gasto e qual tende a ser a sobra do mês.

## Por que o UaiConta existe

Controlar finanças pessoais costuma virar uma mistura de extratos, faturas, anotações, planilhas e cálculos manuais. O UaiConta foi criado para concentrar esse processo em um único lugar e facilitar três perguntas essenciais:

1. **Quanto eu realmente tenho disponível?**
2. **Onde meu dinheiro está indo?**
3. **O que posso ajustar para terminar o mês melhor?**

A proposta não é ser apenas um dashboard bonito. O projeto foi estruturado como um **MVP funcional de gestão financeira pessoal**, com cadastro de receitas e despesas, investimentos, importação de PDFs, análises, projeções, navegação mobile e uma base preparada para persistência real no Supabase.

---

## O que você ganha usando o UaiConta

### Visão financeira rápida

Em poucos segundos é possível enxergar:

- receita do período;
- gastos totais;
- investimentos;
- economia/sobra;
- percentual da renda comprometido;
- projeção de gastos até o fim do mês;
- formas de pagamento mais utilizadas;
- categorias que mais consomem dinheiro.

### Menos cálculo manual

Ao cadastrar quanto você ganha e adicionar seus gastos, o sistema recalcula automaticamente os indicadores financeiros. A ideia é reduzir a necessidade de fazer contas em planilhas ou calculadora toda vez que uma nova movimentação acontece.

### Melhor entendimento dos gastos

O dashboard e a área de análises ajudam a identificar:

- categorias com maior peso no orçamento;
- mudanças de comportamento ao longo do tempo;
- concentração de despesas no cartão ou Pix;
- possíveis excessos;
- espaço para economia e investimento.

### Entrada de dados mais prática

As movimentações podem ser cadastradas manualmente ou importadas a partir de **múltiplos PDFs**. O processamento é feito localmente no navegador com `pdf.js`, sem depender de uma API de IA para ler os documentos.

### Funciona no computador e no celular

A interface foi desenhada para desktop e mobile, com navegação inferior no celular, cards reorganizados, formulários adaptados e gráficos responsivos.

---

# Funcionalidades

## Dashboard

O painel principal reúne os indicadores mais importantes do período selecionado:

- **Receita do mês**;
- **Gastos**;
- **Investimentos**;
- **Economia**;
- gráfico de gastos por categoria;
- comparação entre receita, gastos, investimentos e sobra;
- gráfico Pix x cartão;
- últimas movimentações;
- indicadores e projeções.

Os cards principais são clicáveis e levam para visões detalhadas.

## Período dinâmico

O mês e o ano não ficam hardcoded. O período selecionado controla os indicadores, gráficos e listas exibidos no sistema.

Isso permite navegar entre diferentes meses e entender como o comportamento financeiro mudou ao longo do tempo.

## Receitas

O onboarding pergunta quanto a pessoa recebe e permite cadastrar múltiplas fontes de renda, como:

- salário;
- freelance;
- comissão;
- vendas;
- reembolsos;
- rendimentos;
- outras receitas.

Esses valores entram nos cálculos reais do sistema.

## Movimentações

O usuário pode cadastrar:

- despesa;
- receita;
- investimento;
- transferência.

Cada registro pode conter informações como valor, descrição, categoria, data, forma de pagamento e observações.

A página de movimentações permite consultar os registros e aplicar filtros.

## Categorias

O sistema trabalha com categorias como:

- transporte;
- faculdade;
- psicóloga;
- personal;
- supermercado;
- alimentação;
- saúde;
- diversão;
- lazer;
- gastos gerais;
- investimentos.

A estrutura foi preparada para expansão e personalização.

## Gastos por categoria

Os gastos são apresentados em gráfico de pizza/donut, mostrando a participação percentual de cada categoria dentro das despesas do período.

Isso facilita identificar rapidamente onde está a maior concentração do orçamento.

## Pix x cartão

A comparação entre Pix e cartão usa gráfico de barras por período, permitindo enxergar quanto foi gasto em cada forma de pagamento e como essa distribuição muda ao longo do tempo.

## Análises

A área de análises transforma os dados cadastrados em informações mais úteis, como tendências, comparações e estimativas.

Exemplos de perguntas que o módulo foi pensado para responder:

- meus gastos aumentaram ou diminuíram?;
- qual categoria cresceu mais?;
- quanto da minha renda já está comprometido?;
- quanto devo gastar até o fim do mês mantendo o ritmo atual?;
- qual tende a ser minha sobra?;
- estou investindo uma parcela relevante da minha renda?;

## Cálculos automáticos

O domínio financeiro possui funções separadas para calcular, entre outros:

- receita do período;
- despesas;
- investimentos;
- saldo/sobra;
- comprometimento de renda;
- taxa de economia;
- projeção mensal;
- agrupamentos por categoria;
- agrupamentos por forma de pagamento.

## Importação de vários PDFs

O UaiConta permite selecionar múltiplos PDFs e adicionar novos arquivos em outras rodadas.

O fluxo inclui:

1. seleção dos documentos;
2. processamento em fila;
3. extração local com `pdf.js`;
4. identificação heurística das movimentações;
5. classificação de confiança;
6. revisão antes de salvar;
7. sinalização de possíveis duplicidades.

### Privacidade na leitura dos PDFs

A leitura atual é feita **no próprio navegador**.

O projeto não depende de Anthropic, Claude ou outra API de IA para essa funcionalidade.

Isso significa que, no fluxo padrão de importação, o documento não precisa ser enviado para um modelo externo apenas para que os lançamentos sejam extraídos.

> O parser é heurístico. PDFs digitalizados como imagem ou com layouts muito diferentes podem exigir correção manual na etapa de revisão.

---

# Como o sistema calcula sua situação financeira

O objetivo é diferenciar o que já aconteceu do que ainda é uma estimativa.

## Sobra realizada

Representa a diferença entre o que efetivamente entrou e o que efetivamente saiu no período.

```txt
Sobra realizada = receitas recebidas - despesas realizadas
```

## Sobra estimada

É uma projeção baseada nos dados disponíveis e no ritmo de gastos.

```txt
Sobra estimada = receitas previstas - despesas/projeções previstas
```

Ela deve ser interpretada como **estimativa**, não como valor garantido.

## Percentual da renda comprometido

Ajuda a entender quanto da renda já foi consumido pelos gastos do período.

## Taxa de economia

Indica qual parcela da receita ficou disponível depois das despesas consideradas no cálculo.

---

# Experiência e design

A identidade visual segue uma direção dark, tecnológica e moderna, com roxo/lavanda como destaque.

O projeto busca equilibrar:

- densidade de informação;
- leitura rápida;
- gráficos claros;
- microinterações;
- efeitos de profundidade;
- experiência mobile-first;
- performance.

Há efeitos espaciais/3D leves e redução automática de movimento para usuários que utilizam `prefers-reduced-motion`.

---

# Stack

## Frontend

- React 18
- Vite 5
- Tailwind CSS
- Recharts
- Lucide React
- pdf.js / `pdfjs-dist`

## Dados e autenticação

- Supabase
- PostgreSQL
- Supabase Auth
- Row Level Security (RLS)

## Testes

- Node Test Runner para testes unitários
- Playwright para E2E

## Deploy

- Vercel
- PWA com manifest e service worker

---

# Arquitetura

A aplicação foi separada por responsabilidades para evitar concentrar toda a lógica em uma única tela.

```txt
src/
├── components/
│   ├── AuthScreen.jsx
│   ├── Common.jsx
│   ├── IncomeOnboarding.jsx
│   ├── Navigation.jsx
│   ├── PdfImportModal.jsx
│   └── TransactionForm.jsx
│
├── pages/
│   ├── AnalyticsPage.jsx
│   ├── DashboardPage.jsx
│   ├── DetailPage.jsx
│   ├── MorePage.jsx
│   └── TransactionsPage.jsx
│
├── App.jsx
├── constants.js
├── dataService.js
├── finance.js
├── pdfParserFree.js
├── router.js
├── theme.js
├── utils.js
└── index.css

supabase/
└── schema.sql

tests/
├── unit/
│   ├── finance.test.js
│   └── utils.test.js
└── e2e/
    └── uaiconta.spec.js

public/
├── manifest.webmanifest
├── service-worker.js
├── icon-192.png
└── icon-512.png
```

## Responsabilidades principais

### `finance.js`

Concentra regras e cálculos financeiros em funções separadas e testáveis.

### `dataService.js`

Isola a camada de persistência e permite trabalhar com Supabase quando configurado, mantendo um modo local útil para desenvolvimento.

### `pdfParserFree.js`

Responsável pela extração e normalização das movimentações identificadas em PDFs.

### `pages/`

Separa as principais áreas do produto em telas independentes.

### `components/`

Reúne formulários, navegação, autenticação, importação e componentes reutilizáveis.

---

# Banco de dados e segurança

O projeto inclui `supabase/schema.sql` com a estrutura necessária para persistência em PostgreSQL.

## Row Level Security

As políticas RLS são baseadas no usuário autenticado e seguem o princípio:

```sql
auth.uid() = user_id
```

O objetivo é impedir que um usuário leia ou altere registros financeiros pertencentes a outro usuário.

## Boas práticas adotadas

- UUIDs;
- RLS;
- autenticação pelo Supabase;
- nenhuma `service_role` exposta no frontend;
- variáveis públicas limitadas ao que o cliente Supabase precisa;
- headers de segurança no deploy da Vercel;
- CSP;
- `X-Content-Type-Options`;
- `X-Frame-Options`;
- `Referrer-Policy`;
- `Permissions-Policy`;
- revisão de segurança documentada em `SECURITY_QA.md`.

---

# Como rodar localmente

## 1. Clone o repositório

```bash
git clone https://github.com/annygabb/UaiConta.git
cd UaiConta
```

## 2. Instale as dependências

```bash
npm install
```

## 3. Execute o projeto

```bash
npm run dev
```

Abra o endereço exibido pelo Vite no navegador.

---

# Rodar sem Supabase

Sem variáveis de ambiente, o projeto possui um modo local para desenvolvimento e demonstração.

Isso facilita trabalhar na interface sem precisar configurar o backend imediatamente.

Para uso persistente e multiusuário, configure o Supabase.

---

# Configurar Supabase

## 1. Crie um projeto

Crie um novo projeto no Supabase.

## 2. Execute o schema

Abra o **SQL Editor** e execute:

```txt
supabase/schema.sql
```

## 3. Configure as variáveis

Copie:

```bash
cp .env.example .env.local
```

Preencha:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
```

> Nunca coloque a `service_role` no frontend.

## 4. Reinicie o projeto

```bash
npm run dev
```

Com as variáveis presentes, a aplicação ativa o fluxo de autenticação e utiliza o Supabase para persistência.

---

# Testes

## Unitários

```bash
npm test
```

Os testes cobrem regras financeiras e utilitários importantes para evitar regressões nos cálculos.

## E2E

Instale o navegador do Playwright uma vez:

```bash
npx playwright install chromium
```

Depois execute:

```bash
npm run test:e2e
```

Também existe modo visual:

```bash
npm run test:e2e:ui
```

Os cenários E2E foram preparados para validar fluxos como navegação, criação de dados e experiência mobile.

---

# Build de produção

```bash
npm run build
```

Para visualizar o build localmente:

```bash
npm run preview
```

---

# Deploy na Vercel

O repositório já possui `vercel.json` preparado para SPA e headers de segurança.

## Sem Supabase

O frontend pode ser publicado diretamente.

## Com Supabase

Configure na Vercel:

```env
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Depois faça um novo deploy.

---

# PWA e uso no celular

O projeto inclui:

- `manifest.webmanifest`;
- ícones 192x192 e 512x512;
- service worker;
- modo standalone quando instalado;
- layout responsivo.

Em navegadores compatíveis, o UaiConta pode ser adicionado à tela inicial e utilizado com aparência de aplicativo.

---

# Responsividade

A interface foi pensada para diferentes tamanhos de tela, incluindo smartphones pequenos, tablets e desktop.

No mobile:

- a navegação principal fica na parte inferior;
- tabelas são adaptadas para leitura em tela pequena;
- gráficos são reorganizados;
- formulários ocupam melhor o espaço disponível;
- os elementos de interação recebem áreas maiores para toque.

---

# Qualidade e revisão

O repositório inclui dois documentos úteis para acompanhar o estado técnico:

- `IMPLEMENTATION_REPORT.md` — resumo da implementação;
- `SECURITY_QA.md` — checklist de segurança, qualidade, responsividade e testes.

Eles servem como base para continuar evoluindo o MVP sem perder as decisões arquiteturais já tomadas.

---

# Limitações atuais do MVP

O UaiConta já possui uma base funcional, mas ainda é um projeto em evolução.

Alguns pontos planejados para versões futuras incluem:

- categorias e subcategorias totalmente personalizáveis;
- contas e cartões mais completos;
- orçamento mensal por categoria;
- metas financeiras;
- recorrências avançadas;
- parcelamento completo;
- itens individuais de supermercado;
- histórico de preço por produto;
- mais parsers específicos para diferentes bancos;
- migração integral para TypeScript;
- cobertura E2E maior;
- análises financeiras mais avançadas;
- backup/exportação estruturada.

---

# Escalabilidade

A base foi organizada para que novas funcionalidades não precisem ser colocadas dentro de um único componente gigante.

As regras financeiras ficam separadas da camada visual, a persistência está isolada, o parser de PDFs possui responsabilidade própria e as principais telas vivem em páginas diferentes.

Isso permite evoluir o produto gradualmente para uma arquitetura mais ampla sem precisar recomeçar o projeto do zero.

---

# Objetivo do projeto

O UaiConta busca fazer o usuário sair de:

> “Eu sei que estou gastando, mas não sei exatamente para onde o dinheiro está indo.”

para:

> “Eu sei quanto entrou, quanto saiu, o que está pesando no meu orçamento, quanto provavelmente vai sobrar e onde posso ajustar.”

A prioridade do produto é combinar **clareza financeira, facilidade de uso e informação acionável**.

---

## Projeto

Desenvolvido e mantido por **Anny Gabrielly**.

- GitHub: [@annygabb](https://github.com/annygabb)
- LinkedIn: [Anny Gabrielly](https://www.linkedin.com/in/annygabrielly/)
- Portfólio: [portfoliosolucoesanny.vercel.app](https://portfoliosolucoesanny.vercel.app/)
