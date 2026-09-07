# UaiConta — Design System

Este arquivo é a autoridade visual do projeto. Referências externas servem para inspiração e técnica, não para substituir a identidade do UaiConta.

## Princípios

1. **Finanças claras antes de efeitos.** A interface precisa explicar estado realizado, previsto, recorrente e importado sem depender de animação.
2. **Motion com propósito.** Use animação em transições, feedback e elementos focais. Evite animar tudo ao mesmo tempo.
3. **Mobile-first e estável.** Nenhum popover, filtro, calendário, tabela ou sidebar pode provocar overflow horizontal ou salto de scroll.
4. **Acessibilidade como requisito.** Foco visível, teclado, leitores de tela, contraste e `prefers-reduced-motion` fazem parte do componente, não são etapa posterior.
5. **Consistência acima de novidade.** Reutilize tokens, componentes e padrões existentes antes de criar uma nova variação.

## Identidade

### Paleta Moon

- Rosa suave: `#F5D5E0`
- Lavanda: `#6667AB`
- Roxo principal: `#7B337E`
- Roxo profundo: `#420D4B`
- Fundo profundo: `#210635`
- Superfícies: preto/roxo quase preto, sempre com contraste suficiente para texto branco.

Não use laranja como cor de interação primária. Estados positivos/negativos podem usar cores semânticas, mas o foco, seleção, calendário, checkbox e navegação usam a família roxa.

## Tipografia

- Títulos: grande contraste de escala, peso forte e largura controlada.
- Corpo: confortável para leitura em 320–430 px, sem texto menor que o necessário para caber.
- Valores financeiros importantes nunca podem ficar com contraste insuficiente nem escapar do container.
- Períodos como `Agosto de 2026` devem permanecer inteiros, sem quebrar mês/de/ano em linhas diferentes.

## Componentes

### Sidebar

- Expandida: ícone + texto.
- Recolhida: somente ícones reconhecíveis + tooltip.
- O botão de expandir/recolher fica dentro da largura da sidebar e nunca invade o conteúdo principal.
- O conteúdo principal deve atualizar `margin/padding` pela largura efetiva da sidebar.

### Filtros e selects

- Dropdowns devem abrir em overlay/portal sem alterar largura da página.
- Abrir um filtro não pode mover o scroll vertical do documento.
- Conteúdo do dropdown deve respeitar viewport e usar scroll interno quando necessário.
- Touch targets: mínimo recomendado de 44 × 44 px no mobile.

### Calendário / período

- Tema escuro e roxo, ícones claros.
- O seletor de período usa roleta mês/ano; o seletor de data usa roleta dia/mês/ano.
- Não usar spinners nativos de `input[type=number]` para fechamento/vencimento.

### Cards financeiros

- Valores têm prioridade visual sobre decoração.
- Descrições longas usam truncamento ou quebra controlada; nunca overflow.
- Gráficos e legendas precisam manter contraste em dark mode.

## Motion

- GSAP/Motion apenas em pontos de valor: hero, transição de feedback, moeda 3D, números ou entrada de blocos importantes.
- Duração curta para UI utilitária; movimentos longos apenas em fundos/elementos ambientais.
- Nunca atrasar conteúdo principal por estética.
- `prefers-reduced-motion` desativa loops e reduz transições não essenciais.

### Moeda 3D

- A moeda do hero é interativa por pointer e teclado.
- Setas giram; `Home` restaura a posição inicial.
- A moeda da sobra prevista pode ter linhas financeiras ambientais em loop, sem interferir na leitura dos valores.

## Responsividade

Validar pelo menos: 280, 320, 360, 375, 390, 414, 430, 540, 600, 768, 820, 1024, 1280, 1366, 1440, 1600, 1920 e 2560 px.

Regras:
- `overflow-x` da aplicação deve permanecer zero.
- Modais usam viewport dinâmica (`dvh`) e scroll interno.
- Safe areas precisam ser respeitadas em navegação e ações fixas.
- Tabelas críticas devem ter alternativa em cards no mobile.

## Critério para aceitar nova referência

Antes de adotar biblioteca, componente ou efeito:
- verificar licença e manutenção;
- avaliar tamanho/performance;
- confirmar compatibilidade com React/Vite atual;
- validar acessibilidade;
- verificar como remover sem quebrar o produto;
- preferir copiar/adaptar componentes pequenos a adicionar dependência grande apenas por estética.

## Definition of Done visual

Uma mudança de UI só está pronta quando:
- não tem overflow horizontal;
- funciona por teclado quando interativa;
- mantém foco visível;
- respeita reduced motion;
- passa nos viewports críticos;
- não altera scroll/width ao abrir dropdowns;
- não sacrifica legibilidade para caber;
- passa axe sem violações bloqueadoras.
